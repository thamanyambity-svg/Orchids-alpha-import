/**
 * Utilities pour le dashboard admin - Gestion des prélèvements SEPA
 * Permet aux admins de consulter, relancer ou annuler les transactions
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { getSEPAPaymentStatus } from '@/lib/payments/auto-debit.service'

export interface SEPATransactionSummary {
  id: string
  orderId: string
  type: 'DEPOSIT_60' | 'BALANCE_40'
  amount: number
  currency: string
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED'
  createdAt: string
  buyerEmail?: string
  orderStatus?: string
  retryCount?: number
}

/**
 * Récupère toutes les transactions SEPA d'une période donnée
 */
export async function getSEPATransactionsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<SEPATransactionSummary[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('sepa_payment_transactions')
    .select(
      `
      id,
      order_id,
      type,
      amount,
      currency,
      status,
      created_at,
      metadata,
      orders!inner (
        status,
        import_requests (
          profiles (
            email
          )
        )
      )
    `
    )
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (
    data?.map((tx: any) => ({
      id: tx.id,
      orderId: tx.order_id,
      type: tx.type,
      amount: tx.amount / 100,
      currency: tx.currency,
      status: tx.status,
      createdAt: new Date(tx.created_at).toLocaleString('fr-FR'),
      buyerEmail: tx.orders?.import_requests?.profiles?.email,
      orderStatus: tx.orders?.status
    })) ?? []
  )
}

/**
 * Récupère un résumé des transactions par statut
 */
export async function getSEPATransactionsSummary() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('sepa_payment_transactions')
    .select('status, amount, type')

  if (error) {
    throw error
  }

  const summary = {
    totalByStatus: {
      SUCCEEDED: 0,
      FAILED: 0,
      PENDING: 0
    } as Record<'SUCCEEDED' | 'FAILED' | 'PENDING', number>,
    totalByType: {
      DEPOSIT_60: 0,
      BALANCE_40: 0
    } as Record<'DEPOSIT_60' | 'BALANCE_40', number>,
    totalAmountByStatus: {
      SUCCEEDED: 0,
      FAILED: 0,
      PENDING: 0
    } as Record<'SUCCEEDED' | 'FAILED' | 'PENDING', number>,
    count: data?.length ?? 0
  }

  data?.forEach((tx: any) => {
    const status = tx.status as 'SUCCEEDED' | 'FAILED' | 'PENDING'
    const type = tx.type as 'DEPOSIT_60' | 'BALANCE_40'

    ;(summary.totalByStatus as any)[status] = ((summary.totalByStatus as any)[status] || 0) + 1
    ;(summary.totalByType as any)[type] = ((summary.totalByType as any)[type] || 0) + 1
    ;(summary.totalAmountByStatus as any)[status] = ((summary.totalAmountByStatus as any)[status] || 0) + Number(tx.amount)
  })

  return {
    ...summary,
    totalAmountSucceeded: (summary.totalAmountByStatus.SUCCEEDED / 100).toFixed(2),
    totalAmountFailed: (summary.totalAmountByStatus.FAILED / 100).toFixed(2),
    totalAmountPending: (summary.totalAmountByStatus.PENDING / 100).toFixed(2)
  }
}

/**
 * Récupère les transactions échouées pour une période (candidates à relance)
 */
export async function getFailedSEPATransactions(hoursAgo: number = 24) {
  const supabase = createAdminClient()
  const cutoffDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000)

  const { data, error } = await supabase
    .from('sepa_payment_transactions')
    .select(
      `
      id,
      order_id,
      type,
      amount,
      currency,
      status,
      created_at,
      metadata,
      orders!inner (
        status,
        import_requests (
          profiles (
            id,
            email
          )
        )
      ),
      sepa_payment_retries (
        retry_count
      )
    `
    )
    .eq('status', 'FAILED')
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (
    data?.map((tx: any) => ({
      id: tx.id,
      orderId: tx.order_id,
      type: tx.type,
      amount: (tx.amount / 100).toFixed(2),
      currency: tx.currency,
      errorMessage: tx.metadata?.error_message,
      errorCode: tx.metadata?.error_code,
      failedAt: new Date(tx.created_at).toLocaleString('fr-FR'),
      buyerId: tx.orders?.import_requests?.profiles?.id,
      buyerEmail: tx.orders?.import_requests?.profiles?.email,
      orderStatus: tx.orders?.status,
      retryCount: tx.sepa_payment_retries?.[0]?.retry_count ?? 0
    })) ?? []
  )
}

/**
 * Obtient les détails complets d'une transaction pour affichage
 */
export async function getSEPATransactionDetail(transactionId: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('sepa_payment_transactions')
    .select(
      `
      *,
      orders (
        id,
        status,
        total_amount,
        import_requests (
          id,
          reference,
          profiles (
            id,
            email,
            full_name,
            iban_last4,
            bic
          )
        )
      )
    `
    )
    .eq('id', transactionId)
    .single()

  if (error) {
    throw error
  }

  return {
    id: data.id,
    orderId: data.order_id,
    type: data.type,
    amount: (data.amount / 100).toFixed(2),
    currency: data.currency,
    status: data.status,
    stripeIntentId: data.stripe_payment_intent_id,
    createdAt: new Date(data.created_at).toLocaleString('fr-FR'),
    updatedAt: new Date(data.updated_at).toLocaleString('fr-FR'),
    metadata: data.metadata,
    buyer: {
      id: data.orders?.import_requests?.profiles?.id,
      email: data.orders?.import_requests?.profiles?.email,
      fullName: data.orders?.import_requests?.profiles?.full_name,
      ibanLast4: data.orders?.import_requests?.profiles?.iban_last4,
      bic: data.orders?.import_requests?.profiles?.bic
    },
    order: {
      id: data.orders?.id,
      status: data.orders?.status,
      totalPrice: data.orders?.total_price,
      reference: data.orders?.import_requests?.reference
    }
  }
}

/**
 * Crée une alerte pour un administrateur
 */
export async function createSEPAAlertForAdmin(
  adminId: string,
  transactionId: string,
  severity: 'WARNING' | 'CRITICAL' | 'INFO',
  message: string
) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('audit_logs')
    .insert({
      actor_id: 'SYSTEM',
      action: 'SEPA_ALERT',
      resource_type: 'TRANSACTION',
      resource_id: transactionId,
      details: {
        severity,
        message,
        admin_id: adminId,
        timestamp: new Date().toISOString()
      }
    })

  if (error) {
    console.error('Failed to create alert:', error)
    return { success: false }
  }

  // `data` peut être null ou un tableau contenant l'enregistrement inséré
  const inserted = Array.isArray(data) ? data as any[] : []
  const alertId = inserted.length > 0 ? inserted[0].id : undefined

  return { success: true, alertId }
}

/**
 * Relance une tentative de prélèvement échouée
 */
export async function initiateRetryForFailedSEPA(
  transactionId: string,
  adminId: string
) {
  const supabase = createAdminClient()

  // Récupérer la transaction
  const { data: tx, error: fetchError } = await supabase
    .from('sepa_payment_transactions')
    .select('order_id, type')
    .eq('id', transactionId)
    .single()

  if (fetchError || !tx) {
    throw new Error('Transaction not found')
  }

  const percentage = tx.type === 'DEPOSIT_60' ? 0.6 : 0.4

  try {
    // Déclencher la relance
    const result = await retryFailedSEPA(tx.order_id, percentage)

    // Enregistrer la relance
    const { error: retryError } = await supabase
      .from('sepa_payment_retries')
      .insert({
        transaction_id: transactionId,
        retry_count: 1,
        last_retry_at: new Date().toISOString()
      })

    if (retryError) {
      console.error('Failed to record retry:', retryError)
    }

    // Créer une alerte de suivi
    await createSEPAAlertForAdmin(
      adminId,
      transactionId,
      'INFO',
      `SEPA payment retry initiated by admin. New intent: ${result.intentId}`
    )

    return {
      success: true,
      newIntentId: result.intentId
    }
  } catch (error: any) {
    // Créer une alerte d'erreur
    await createSEPAAlertForAdmin(
      adminId,
      transactionId,
      'CRITICAL',
      `SEPA payment retry failed: ${error.message}`
    )

    throw error
  }
}

/**
 * Fonction interne pour relancer le prélèvement
 */
async function retryFailedSEPA(orderId: string, percentage: 0.6 | 0.4) {
  const { processAutomaticDebit } = await import('@/lib/payments/auto-debit.service')

  const retryKey = `order_${orderId}_${percentage}_retry_${Date.now()}`
  const result = await processAutomaticDebit(orderId, percentage, retryKey)

  return {
    intentId: result.paymentIntentId,
    status: result.status,
    amount: result.amount
  }
}

/**
 * Génère un rapport de prélèvements pour la période
 */
export async function generateSEPAReport(
  startDate: Date,
  endDate: Date
): Promise<{
  period: string
  summary: any
  transactions: SEPATransactionSummary[]
  successRate: string
}> {
  const transactions = await getSEPATransactionsByDateRange(startDate, endDate)
  const summary = await getSEPATransactionsSummary()

  const totalCount = transactions.length
  const successCount = transactions.filter((t) => t.status === 'SUCCEEDED').length
  const successRate = totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(2) : '0.00'

  return {
    period: `${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')}`,
    summary,
    transactions,
    successRate: `${successRate}%`
  }
}
