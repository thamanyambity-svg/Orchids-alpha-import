/**
 * Guide d'intégration du système de prélèvements SEPA automatiques 60/40
 * dans les workflows métier existants
 */

/**
 * IMPLÉMENTATION DANS LE WORKFLOW DE VALIDATION DE COMMANDE
 *
 * Lorsqu'un administrateur valide une demande d'import (passe de PENDING à VALIDATED),
 * le système doit déclencher automatiquement le prélèvement des 60% de dépôt.
 *
 * Exemple d'appel :
 */
import { processAutomaticDebit } from '@/lib/payments/auto-debit.service'

export async function validateOrderAndTriggerDeposit(
  orderId: string
): Promise<{
  success: boolean
  transactionId?: string
  error?: string
}> {
  try {
    // 1. Effectuer les validations métier habituelles
    // ... (contrôles de conformité, vérifications stocks, etc.)

    // 2. Déclencher le prélèvement automatique 60%
    const result = await processAutomaticDebit(orderId, 0.6)

    // 3. Le webhook Stripe gérera automatiquement :
    //    - Enregistrement dans sepa_payment_transactions
    //    - Mise à jour du statut ordre (AWAITING_DEPOSIT -> FUNDED)
    //    - Notifications à n8n

    console.log(`✅ SEPA 60% initiated for order ${orderId}`)
    return {
      success: true,
      transactionId: result.paymentIntentId
    }
  } catch (error: any) {
    console.error(`❌ Failed to trigger deposit debit for ${orderId}:`, error)

    // IMPORTANT: Ne pas faire échouer la validation de la commande si le prélèvement échoue
    // L'admin doit gérer l'échec de paiement manuellement via le dashboard
    // (relancer, contacter le client, etc.)

    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * IMPLÉMENTATION DANS LE WORKFLOW DE LIVRAISON
 *
 * Lorsqu'une commande est marquée comme DELIVERED,
 * le système doit déclencher automatiquement le prélèvement des 40% de solde.
 */
export async function markOrderDeliveredAndTriggerBalance(
  orderId: string
): Promise<{
  success: boolean
  transactionId?: string
  error?: string
}> {
  try {
    // 1. Effectuer les validations de livraison
    // ... (vérifications de la logistique, etc.)

    // 2. Déclencher le prélèvement automatique 40%
    const result = await processAutomaticDebit(orderId, 0.4)

    console.log(`✅ SEPA 40% initiated for order ${orderId}`)
    return {
      success: true,
      transactionId: result.paymentIntentId
    }
  } catch (error: any) {
    console.error(`❌ Failed to trigger balance debit for ${orderId}:`, error)

    // En cas d'échec, la commande reste en DELIVERED
    // Une alerte est envoyée à l'admin via le webhook
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * VÉRIFICATION DU STATUT D'ACTIVATION DU MANDAT SEPA
 *
 * Appeler cette fonction avant de permettre à un acheteur de valider une commande
 * pour s'assurer qu'il a un mandat SEPA activé.
 */
export async function checkBuyerHasSEPAMandate(
  buyerId: string
): Promise<boolean> {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('mandate_activated, stripe_payment_method_id')
    .eq('id', buyerId)
    .single()

  if (error || !data) {
    return false
  }

  return data.mandate_activated === true && data.stripe_payment_method_id !== null
}

/**
 * GESTION DES ERREURS DE PAIEMENT SEPA
 *
 * En cas d'échec de prélèvement, le webhook envoie une notification à n8n
 * qui peut déclencher un email ou une alerte au client.
 *
 * Les codes d'erreur courants SEPA :
 * - insufficient_funds: Solde insuffisant
 * - authentication_error: Identifiant ou mot de passe incorrect
 * - account_closed: Compte fermé
 * - card_declined: Carte refusée (si débit par carte)
 * - lost_card: Carte perdue
 * - generic_decline: Refus générique de la banque
 */

/**
 * DASHBOARD ADMIN - VÉRIFIER LES TRANSACTIONS SEPA
 *
 * Requête pour afficher les transactions SEPA d'une commande :
 */
export async function getSEPATransactionsForOrder(orderId: string) {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('sepa_payment_transactions')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data?.map((tx) => ({
    id: tx.id,
    type: tx.type,
    amount: (tx.amount / 100).toFixed(2),
    currency: tx.currency,
    status: tx.status,
    createdAt: new Date(tx.created_at).toLocaleString('fr-FR'),
    metadata: tx.metadata,
    stripeIntentId: tx.stripe_payment_intent_id
  }))
}

/**
 * RELANCER UN PRÉLÈVEMENT ÉCHOUÉ
 *
 * Note: Cette fonction nécessite une gestion manual par l'admin
 * car Stripe ne permet pas la relance automatique sans accord du client
 */
export async function retryFailedSEPAPayment(
  orderId: string,
  percentage: 0.6 | 0.4
) {
  const { processAutomaticDebit } = await import('@/lib/payments/auto-debit.service')

  try {
    // Créer une nouvelle clé d'idempotence (nouvelle tentative)
    const retryKey = `order_${orderId}_${percentage}_retry_${Date.now()}`
    const result = await processAutomaticDebit(orderId, percentage, retryKey)

    console.log(`✅ SEPA payment retry initiated: ${result.paymentIntentId}`)
    return { success: true, intentId: result.paymentIntentId }
  } catch (error: any) {
    console.error(`❌ Failed to retry SEPA payment:`, error)
    return { success: false, error: error.message }
  }
}

/**
 * FRONTEND - EXEMPLE D'INTÉGRATION DANS LE DASHBOARD ACHETEUR
 *
 * 1. Afficher un formulaire IBAN/BIC pour l'acheteur
 * 2. Appeler /api/payment/setup-mandate
 * 3. Confirmer le SetupIntent avec Stripe.js
 * 4. Appeler /api/payment/confirm-mandate
 * 5. Afficher le statut du mandat
 *
 * Exemple de composant React :
 */

/*
import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'

export function SEPAMandateForm() {
  const [iban, setIBAN] = useState('')
  const [bic, setBIC] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle')

  const handleSetupMandate = async () => {
    setLoading(true)
    setStatus('pending')

    try {
      // 1. Créer le SetupIntent
      const setupRes = await fetch('/api/payment/setup-mandate', {
        method: 'POST',
        body: JSON.stringify({ iban, bic })
      })
      const { clientSecret } = await setupRes.json()

      // 2. Confirmer avec Stripe (côté client)
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
      const { setupIntent, error } = await stripe!.confirmSepaDebitSetup(clientSecret)

      if (error) throw error

      // 3. Confirmer côté backend
      const confirmRes = await fetch('/api/payment/confirm-mandate', {
        method: 'POST',
        body: JSON.stringify({ setupIntentId: setupIntent!.id })
      })

      if (confirmRes.ok) {
        setStatus('success')
      } else {
        throw new Error('Confirmation failed')
      }
    } catch (error) {
      console.error(error)
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="sepa-mandate-form">
      <h3>Activer le prélèvement SEPA</h3>
      <input
        type="text"
        placeholder="IBAN"
        value={iban}
        onChange={(e) => setIBAN(e.target.value)}
      />
      <input
        type="text"
        placeholder="BIC"
        value={bic}
        onChange={(e) => setBIC(e.target.value)}
      />
      <button
        onClick={handleSetupMandate}
        disabled={loading || !iban || !bic}
      >
        {loading ? 'En cours...' : 'Confirmer le mandat'}
      </button>
      {status === 'success' && <p>✅ Mandat SEPA activé</p>}
      {status === 'error' && <p>❌ Erreur lors de l'activation</p>}
    </div>
  )
}
*/

export const SEPAIntegrationGuide = {
  description: 'Fichier de référence pour intégrer le système SEPA automatique',
  lastUpdated: '2026-07-14',
  version: '1.0'
}
