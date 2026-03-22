'use server'

import { createClient } from '@supabase/supabase-js'
import { ok, fail } from '@/lib/server-actions/result'
import type { ServerActionResult } from '@/lib/server-actions/result'
import {
  requireAuthenticatedUser,
  verifyOrderOwnership,
} from '@/lib/server-actions/client-guard'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrderFinancialSummary {
  /** Montant principal en USD */
  amountUSD: number
  /** Équivalent calculé en CDF — null si taux non disponible */
  amountCDF: number | null
  /** Taux appliqué — null si non disponible */
  exchangeRate: number | null
  /** Date de mise en vigueur du taux affiché — ISO 8601 */
  rateValidFrom: string | null
  /** Note admin sur le taux (ex: "Taux BCC du 22/03/2026") */
  rateAdminNote: string | null
  /** Vrai si un taux actif existe et le calcul CDF est disponible */
  rateAvailable: boolean
  /**
   * Source du taux :
   * FROZEN    → taux gelé sur la transaction (immuable)
   * LIVE      → taux actif en base (indicatif, pas encore gelé)
   * UNAVAILABLE → aucun taux configuré par l'admin
   */
  rateSource: 'FROZEN' | 'LIVE' | 'UNAVAILABLE'
  currency: 'USD'
  localCurrency: 'CDF'
}

// ─── Client service role (transactions RLS admin-only + taux) ────────────────

function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Configuration serveur Supabase incomplète.')
  }
  return createClient(url, key)
}

// ─── Utilitaire : arrondi financier ──────────────────────────────────────────

function roundFinancial(value: number): number {
  return Math.round(value * 100) / 100
}

type TransactionRow = {
  id: string
  amount: number
  currency: string
  status: string
  exchange_rate_at_time: number | null
  exchange_rate_id: string | null
}

async function fetchLatestOrderTransaction(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  orderId: string
): Promise<{ data: TransactionRow | null; error: Error | null }> {
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select(
      `
        id,
        amount,
        currency,
        status,
        exchange_rate_at_time,
        exchange_rate_id
      `
    )
    .eq('order_id', orderId)
    .in('status', ['PENDING', 'SUCCEEDED'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }
  return { data: data as TransactionRow | null, error: null }
}

/**
 * Taux USD→CDF actif (même logique que l’admin : dernière ligne créée).
 */
async function fetchLiveUsdToCdfRate(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>
): Promise<{
  rate: number
  effective_at: string
  notes: string | null
} | null> {
  const { data, error } = await supabaseAdmin
    .from('exchange_rates')
    .select('rate, effective_at, notes')
    .eq('from_currency', 'USD')
    .eq('to_currency', 'CDF')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return {
    rate: Number(data.rate),
    effective_at: data.effective_at,
    notes: data.notes,
  }
}

// ─── Action principale ────────────────────────────────────────────────────────

/**
 * Récupère le résumé financier d'une commande pour l'affichage client.
 *
 * Aligné sur le schéma réel :
 * - Statuts transactions : PENDING / SUCCEEDED
 * - Taux gelé : exchange_rate_at_time + exchange_rate_id sur transactions (si colonnes présentes)
 * - Taux live : dernière ligne exchange_rates USD→CDF
 *
 * Logique taux :
 * 1. Si exchange_rate_at_time + exchange_rate_id sur la transaction → FROZEN
 * 2. Sinon → taux actif en base → LIVE (indicatif)
 * 3. Si aucun taux → UNAVAILABLE (USD seul)
 *
 * Lecture seule — aucune écriture. Accès DB via service role après verifyOrderOwnership
 * (les transactions sont en RLS admin-only dans ce projet).
 */
export async function getOrderFinancialSummary(
  orderId: string
): Promise<ServerActionResult<OrderFinancialSummary>> {
  try {
    const user = await requireAuthenticatedUser()

    if (!orderId?.trim()) {
      return fail('Identifiant de commande manquant.')
    }

    await verifyOrderOwnership(orderId, user.id)

    const supabaseAdmin = createSupabaseAdminClient()

    const { data: transaction, error: txError } =
      await fetchLatestOrderTransaction(supabaseAdmin, orderId)

    if (txError) {
      return fail('Impossible de charger les données financières de la commande.')
    }

    if (!transaction) {
      return fail(
        'Aucune transaction trouvée pour cette commande. ' +
          'Le résumé financier sera disponible après initiation du paiement.'
      )
    }

    const amountUSD = Number(transaction.amount)

    // ── Cas 1 : taux gelé sur la transaction (FROZEN) ─────────
    const frozenRate = transaction.exchange_rate_at_time
    const frozenId = transaction.exchange_rate_id
    if (
      frozenRate != null &&
      !Number.isNaN(frozenRate) &&
      frozenId
    ) {
      const amountCDF = roundFinancial(amountUSD * frozenRate)

      const { data: rateRow } = await supabaseAdmin
        .from('exchange_rates')
        .select('effective_at, notes')
        .eq('id', frozenId)
        .maybeSingle()

      return ok({
        amountUSD,
        amountCDF,
        exchangeRate: frozenRate,
        rateValidFrom: rateRow?.effective_at ?? null,
        rateAdminNote: rateRow?.notes ?? null,
        rateAvailable: true,
        rateSource: 'FROZEN',
        currency: 'USD',
        localCurrency: 'CDF',
      })
    }

    // ── Cas 2 : taux actif en base (LIVE) ─────────
    const live = await fetchLiveUsdToCdfRate(supabaseAdmin)

    if (!live) {
      return ok({
        amountUSD,
        amountCDF: null,
        exchangeRate: null,
        rateValidFrom: null,
        rateAdminNote: null,
        rateAvailable: false,
        rateSource: 'UNAVAILABLE',
        currency: 'USD',
        localCurrency: 'CDF',
      })
    }

    const amountCDF = roundFinancial(amountUSD * live.rate)

    return ok({
      amountUSD,
      amountCDF,
      exchangeRate: live.rate,
      rateValidFrom: live.effective_at,
      rateAdminNote: live.notes,
      rateAvailable: true,
      rateSource: 'LIVE',
      currency: 'USD',
      localCurrency: 'CDF',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.'
    console.error('[getOrderFinancialSummary] Erreur :', message)
    return fail(message)
  }
}
