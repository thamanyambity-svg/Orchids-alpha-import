'use server'

import { createClient } from '@supabase/supabase-js'
import { ok, fail } from '@/lib/server-actions/result'
import type { ServerActionResult } from '@/lib/server-actions/result'
import {
  requireCustomsRole,
  type CustomsFileStatus,
} from '@/lib/server-actions/customs-guard'

export interface CreateCustomsFileInput {
  order_id: string
  request_id: string
  transport_mode: 'AIR' | 'SEA' | 'LAND'
  transport_ref?: string
  vessel_flight_name?: string
  container_number?: string
  assigned_partner_id?: string
  country_code?: string
}

export interface CreateCustomsFileResult {
  customsFileId: string
  status: CustomsFileStatus
  reference: string
}

function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Configuration serveur Supabase incomplète.')
  }
  return createClient(url, key)
}

export async function createCustomsFile(
  input: CreateCustomsFileInput
): Promise<ServerActionResult<CreateCustomsFileResult>> {
  try {
    const user = await requireCustomsRole()

    if (!['ADMIN', 'PARTNER_COUNTRY', 'PARTNER'].includes(user.role)) {
      return fail(
        'Seuls les Administrateurs et Partenaires Pays peuvent créer des dossiers douaniers.'
      )
    }

    if (!input.order_id?.trim()) {
      return fail("L'identifiant de commande est obligatoire.")
    }
    if (!input.request_id?.trim()) {
      return fail("L'identifiant de demande d'import est obligatoire.")
    }
    if (!['AIR', 'SEA', 'LAND'].includes(input.transport_mode)) {
      return fail('Le mode de transport doit être AIR, SEA ou LAND.')
    }
    if (input.container_number && input.transport_mode !== 'SEA') {
      return fail(
        'Le numéro de conteneur est réservé au transport maritime (SEA).'
      )
    }

    const supabaseAdmin = createSupabaseAdminClient()

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, request_id')
      .eq('id', input.order_id.trim())
      .single()

    if (orderError || !order) {
      return fail('Commande introuvable.')
    }

    if (order.request_id !== input.request_id.trim()) {
      return fail(
        'La demande d’import ne correspond pas à la commande indiquée.'
      )
    }

    let assignedPartnerId: string | null = input.assigned_partner_id ?? null

    if (user.role === 'PARTNER' || user.role === 'PARTNER_COUNTRY') {
      const { data: pp, error: ppErr } = await supabaseAdmin
        .from('partner_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (ppErr || !pp) {
        return fail('Profil partenaire introuvable.')
      }

      const { data: request, error: requestError } = await supabaseAdmin
        .from('import_requests')
        .select('id, assigned_partner_id')
        .eq('id', input.request_id.trim())
        .single()

      if (requestError || !request) {
        return fail("Demande d'import introuvable.")
      }

      if (request.assigned_partner_id !== pp.id) {
        console.warn(
          `[createCustomsFile] PARTNER user=${user.id} pp=${pp.id} request=${input.request_id} assigné=${request.assigned_partner_id}`
        )
        return fail('Commande introuvable ou accès non autorisé.')
      }

      assignedPartnerId = pp.id
    }

    const ACTIVE_STATUSES: CustomsFileStatus[] = [
      'DRAFT',
      'PRE_ADVICE',
      'IN_CUSTOMS',
      'LIQUIDATED',
      'PAID',
      'BLOCKED',
    ]

    const { data: existingFile } = await supabaseAdmin
      .from('customs_files')
      .select('id, status')
      .eq('order_id', input.order_id.trim())
      .in('status', ACTIVE_STATUSES)
      .maybeSingle()

    if (existingFile) {
      return fail(
        `Un dossier douanier actif existe déjà pour cette commande (statut : ${existingFile.status}).`
      )
    }

    const { data: newFile, error: insertError } = await supabaseAdmin
      .from('customs_files')
      .insert({
        order_id: input.order_id.trim(),
        request_id: input.request_id.trim(),
        country_code: input.country_code?.toUpperCase() ?? 'CD',
        transport_mode: input.transport_mode,
        transport_ref: input.transport_ref?.trim() ?? null,
        vessel_flight_name: input.vessel_flight_name?.trim() ?? null,
        container_number: input.container_number?.trim() ?? null,
        assigned_partner_id: assignedPartnerId,
        created_by: user.id,
        status: 'DRAFT',
      })
      .select('id, status')
      .single()

    if (insertError || !newFile) {
      console.error('[createCustomsFile] insert', insertError)
      return fail('Erreur lors de la création du dossier douanier.')
    }

    return ok({
      customsFileId: newFile.id,
      status: newFile.status as CustomsFileStatus,
      reference: input.order_id.trim().slice(0, 8).toUpperCase(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.'
    console.error('[createCustomsFile]', message)
    return fail(message)
  }
}
