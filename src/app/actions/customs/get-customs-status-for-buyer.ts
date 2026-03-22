/**
 * Action serveur — Statut douanier pour l'acheteur
 *
 * Lecture seule. Aucun montant fiscal exposé.
 * Vérifie import_requests.buyer_id = auth.uid(), puis lecture via service role
 * (les tables customs_* n’ont pas de politique RLS acheteur).
 */

'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { ok, fail } from '@/lib/server-actions/result'
import type { ServerActionResult } from '@/lib/server-actions/result'

// ─── Types exportés ───────────────────────────────────────────────────────────

export interface CustomsStatusHistoryEntry {
  id: string
  status_from: string | null
  status_to: string
  reason: string | null
  changed_at: string
}

export interface CustomsStatusForBuyer {
  customs_file_id: string
  status: string
  transport_mode: string | null
  transport_ref: string | null
  vessel_flight_name: string | null
  container_number: string | null
  country_code: string
  has_declaration: boolean
  is_fiscal_validated: boolean
  is_accounting_validated: boolean
  status_history: CustomsStatusHistoryEntry[]
  created_at: string
  updated_at: string
}

function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Configuration serveur Supabase incomplète.')
  }
  return createAdminClient(url, key)
}

// ─── Action ───────────────────────────────────────────────────────────────────

export async function getCustomsStatusForBuyer(
  requestId: string
): Promise<ServerActionResult<CustomsStatusForBuyer | null>> {
  if (!requestId?.trim()) return fail('Identifiant de demande manquant.')

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) return fail('Non authentifié.')

  const { data: request, error: reqError } = await supabase
    .from('import_requests')
    .select('id, buyer_id')
    .eq('id', requestId)
    .single()

  if (reqError || !request) return fail('Demande introuvable.')
  if (request.buyer_id !== user.id) return fail('Accès non autorisé.')

  const admin = createSupabaseAdminClient()

  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id')
    .eq('request_id', requestId)
    .maybeSingle()

  if (orderError) return fail('Erreur lors de la recherche de la commande.')

  if (!order) return ok(null)

  const { data: file, error: fileError } = await admin
    .from('customs_files')
    .select(
      'id, status, transport_mode, transport_ref, vessel_flight_name, container_number, country_code, created_at, updated_at'
    )
    .eq('order_id', order.id)
    .eq('request_id', requestId)
    .neq('status', 'DRAFT')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fileError) return fail('Erreur lors du chargement du dossier douanier.')
  if (!file) return ok(null)

  const { data: declaration } = await admin
    .from('customs_declarations')
    .select('id, is_fiscal_validated, is_accounting_validated')
    .eq('customs_file_id', file.id)
    .maybeSingle()

  const { data: historyRows, error: historyError } = await admin
    .from('customs_status_history')
    .select('id, status_from, status_to, reason, changed_at')
    .eq('customs_file_id', file.id)
    .order('changed_at', { ascending: false })
    .limit(20)

  if (historyError) return fail("Erreur lors du chargement de l'historique.")

  const result: CustomsStatusForBuyer = {
    customs_file_id: file.id,
    status: file.status,
    transport_mode: file.transport_mode,
    transport_ref: file.transport_ref,
    vessel_flight_name: file.vessel_flight_name,
    container_number: file.container_number,
    country_code: file.country_code,
    has_declaration: !!declaration,
    is_fiscal_validated: declaration?.is_fiscal_validated ?? false,
    is_accounting_validated: declaration?.is_accounting_validated ?? false,
    status_history: (historyRows ?? []) as CustomsStatusHistoryEntry[],
    created_at: file.created_at,
    updated_at: file.updated_at,
  }

  return ok(result)
}
