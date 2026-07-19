import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateIBAN, validateBIC } from './iban-validator'

/**
 * Service de gestion des prélèvements SEPA automatiques
 * - Enrôlement du mandat (SetupIntent)
 * - Déclenchement des prélèvements (PaymentIntent off-session)
 */

/**
 * Étape 1 : Création du SetupIntent pour enrôler un mandat SEPA
 * Retourne le client secret à confirmer côté client
 */
export async function setupDirectDebitMandate(
  userId: string,
  iban: string,
  bic: string,
  email: string,
  fullName: string,
  clientIp: string = '127.0.0.1'
): Promise<{
  clientSecret: string
  customerId: string
}> {
  const ibanValidation = validateIBAN(iban)
  if (!ibanValidation.valid) {
    throw new Error(`IBAN validation failed: ${ibanValidation.error}`)
  }

  if (!validateBIC(bic)) {
    throw new Error('BIC validation failed: Invalid format')
  }

  const supabaseAdmin = createAdminClient()

  // Récupérer ou créer le customer Stripe
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  if (profileError) {
    throw new Error(`Profile not found: ${profileError.message}`)
  }

  let customerId = profileData?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      name: fullName,
      metadata: {
        supabase_user_id: userId,
        created_by: 'orchids_sepa_setup'
      }
    })
    customerId = customer.id

    // Sauvegarder le customer ID
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', userId)

    if (updateError) {
      console.error('Failed to save stripe_customer_id:', updateError)
    }
  }

  // Créer le SetupIntent pour SEPA Direct Debit
  const setupIntent = await stripe.setupIntents.create({
    payment_method_types: ['sepa_debit'],
    customer: customerId,
    mandate_data: {
      customer_acceptance: {
        type: 'online',
        online: {
          ip_address: clientIp,
          user_agent: 'Orchids-Alpha-Import-App'
        }
      }
    },
    usage: 'off_session'
  })

  return {
    clientSecret: setupIntent.client_secret!,
    customerId
  }
}

/**
 * Étape 2 : Confirmation du mandat après le SetupIntent
 * Sauvegarde le payment method et active le mandat
 */
export async function confirmDirectDebitMandate(
  userId: string,
  setupIntentId: string
): Promise<{
  success: boolean
  paymentMethodId: string
  mandateId: string
  lastFour: string
  bic: string
}> {
  const supabaseAdmin = createAdminClient()

  // Récupérer le SetupIntent depuis Stripe
  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId)

  if (setupIntent.status !== 'succeeded') {
    throw new Error(`SetupIntent not confirmed: status=${setupIntent.status}`)
  }

  const paymentMethodId = setupIntent.payment_method as string
  const mandateId = setupIntent.mandate as string

  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)
  const sepaDetails = paymentMethod.sepa_debit

  if (!sepaDetails) {
    throw new Error('SEPA debit details not found in PaymentMethod')
  }

  // Sauvegarder le payment method dans le profil
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      stripe_payment_method_id: paymentMethodId,
      stripe_mandate_id: mandateId,
      mandate_activated: true,
      iban_last4: sepaDetails.last4 || null,
      bic: sepaDetails.bank_code || null
    })
    .eq('id', userId)

  if (updateError) {
    throw new Error(`Failed to save mandate details: ${updateError.message}`)
  }

  return {
    success: true,
    paymentMethodId,
    mandateId,
    lastFour: sepaDetails.last4 || '',
    bic: sepaDetails.bank_code || ''
  }
}

/**
 * Étape 3 : Déclenchement du prélèvement automatique (Off-Session)
 * Appelé lors de la validation d'une commande (60%) ou de la livraison (40%)
 */
export async function processAutomaticDebit(
  orderId: string,
  percentage: 0.6 | 0.4,
  idempotencyKey?: string
): Promise<{
  paymentIntentId: string
  status: string
  amount: number
}> {
  const supabaseAdmin = createAdminClient()

  // Récupérer la commande avec les infos du buyer
  const { data: orderData, error: orderError } = await supabaseAdmin
    .from('orders')
    .select(
      `
      id,
      total_amount,
      request_id,
      request:import_requests(
        buyer:profiles!buyer_id(
          id,
          stripe_customer_id,
          stripe_payment_method_id,
          email,
          full_name
        )
      )
    `
    )
    .eq('id', orderId)
    .single()

  if (orderError || !orderData) {
    throw new Error(`Order not found: ${orderError?.message}`)
  }

  const requestRecord = Array.isArray(orderData.request)
    ? orderData.request[0]
    : orderData.request
  let profile: any = requestRecord?.buyer

  // Supabase nested relations can come back as arrays; normalize to single object
  if (Array.isArray(profile)) profile = profile[0]

  if (!profile?.stripe_customer_id || !profile?.stripe_payment_method_id) {
    throw new Error('No SEPA mandate found for this buyer')
  }
  // Support both `total_amount` and `total_price` column names (fallback)
  const totalValue = typeof orderData.total_amount === 'number' ? orderData.total_amount : (orderData as any).total_price
  const totalInCents = Math.round(totalValue * 100)
  const amountCents = Math.round(totalInCents * percentage)

  if (amountCents === 0) {
    throw new Error('Payment amount is zero')
  }

  const paymentType = percentage === 0.6 ? 'DEPOSIT_60' : 'BALANCE_40'
  const currentIdempotencyKey = idempotencyKey || `order_${orderId}_${paymentType}_${Date.now()}`

  // Créer le PaymentIntent en mode "off_session"
  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: amountCents,
      currency: 'eur',
      customer: profile.stripe_customer_id,
      payment_method: profile.stripe_payment_method_id,
      off_session: true,
      confirm: true,
      statement_descriptor: `Orchids Order ${orderId.substring(0, 8)}`,
      metadata: {
        order_id: orderId,
        type: paymentType,
        user_email: profile.email
      }
    },
    {
      idempotencyKey: currentIdempotencyKey
    }
  )

  // Enregistrer la tentative dans la table de traçabilité
  const { error: txError } = await supabaseAdmin
    .from('sepa_payment_transactions')
    .insert({
      order_id: orderId,
      stripe_payment_intent_id: paymentIntent.id,
      amount: amountCents,
      currency: 'eur',
      type: paymentType,
      status: paymentIntent.status === 'succeeded' ? 'SUCCEEDED' : 'PENDING',
      metadata: {
        payment_intent_status: paymentIntent.status,
        customer_email: profile.email,
        created_via: 'api'
      }
    })

  if (txError) {
    console.error('Failed to record SEPA transaction:', txError)
  }

  return {
    paymentIntentId: paymentIntent.id,
    status: paymentIntent.status,
    amount: amountCents / 100
  }
}

export async function retryFailedSEPAPayment(
  orderId: string,
  percentage: 0.6 | 0.4,
  idempotencyKey?: string
) {
  return processAutomaticDebit(orderId, percentage, idempotencyKey)
}

/**
 * Récupère l'état d'un prélèvement SEPA
 */
export async function getSEPAPaymentStatus(paymentIntentId: string) {
  const supabaseAdmin = createAdminClient()

  const { data, error } = await supabaseAdmin
    .from('sepa_payment_transactions')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    throw new Error(`Failed to retrieve payment status: ${error.message}`)
  }

  if (!data) {
    // Fallback: query Stripe directly
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    return {
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      source: 'stripe_direct'
    }
  }

  return {
    status: data.status,
    amount: data.amount,
    type: data.type,
    orderId: data.order_id,
    createdAt: data.created_at,
    metadata: data.metadata
  }
}

/**
 * Annule un prélèvement SEPA (si possible)
 */
export async function cancelSEPAPayment(paymentIntentId: string, reason?: string) {
  const supabaseAdmin = createAdminClient()

  try {
    // Essayer d'annuler côté Stripe
    const cancelledIntent = await stripe.paymentIntents.cancel(paymentIntentId, {
      cancellation_reason: reason ? 'requested_by_customer' : undefined
    })

    // Mettre à jour le statut en base
    await supabaseAdmin
      .from('sepa_payment_transactions')
      .update({
        status: 'FAILED',
        metadata: {
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason
        }
      })
      .eq('stripe_payment_intent_id', paymentIntentId)

    return {
      success: true,
      paymentIntentId: cancelledIntent.id,
      status: cancelledIntent.status
    }
  } catch (error) {
    throw new Error(
      `Failed to cancel payment: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
