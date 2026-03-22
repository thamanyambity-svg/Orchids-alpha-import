'use server'

import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { ok, fail } from '@/lib/server-actions/result'
import type { ServerActionResult } from '@/lib/server-actions/result'
import {
  requireCustomsRole,
  verifyCustomsFileAccess,
  verifyTransitionAllowed,
  type CustomsFileStatus,
} from '@/lib/server-actions/customs-guard'

export interface UpdateCustomsStatusInput {
  customsFileId: string
  newStatus: CustomsFileStatus
  /** Obligatoire si newStatus = 'BLOCKED' */
  reason?: string
}

export interface UpdateCustomsStatusResult {
  customsFileId: string
  previousStatus: CustomsFileStatus
  newStatus: CustomsFileStatus
  changedAt: string
}

function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Configuration serveur Supabase incomplète.')
  }
  return createClient(url, key)
}

async function getClientIp(): Promise<string | null> {
  const headerStore = await headers()
  return (
    headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headerStore.get('x-real-ip') ??
    null
  )
}

/**
 * Historique inséré explicitement (service role : pas d’auth.uid() dans un trigger).
 */
export async function updateCustomsStatus(
  input: UpdateCustomsStatusInput
): Promise<ServerActionResult<UpdateCustomsStatusResult>> {
  try {
    const user = await requireCustomsRole()

    if (!input.customsFileId?.trim()) {
      return fail('Identifiant de dossier manquant.')
    }

    const VALID_STATUSES: CustomsFileStatus[] = [
      'DRAFT',
      'PRE_ADVICE',
      'IN_CUSTOMS',
      'LIQUIDATED',
      'PAID',
      'RELEASED',
      'BLOCKED',
    ]

    if (!VALID_STATUSES.includes(input.newStatus)) {
      return fail(`Statut invalide : ${input.newStatus}.`)
    }

    if (input.newStatus === 'BLOCKED') {
      if (!input.reason?.trim() || input.reason.trim().length < 10) {
        return fail(
          'La raison du blocage est obligatoire et doit contenir au moins 10 caractères.'
        )
      }
    }

    const file = await verifyCustomsFileAccess(input.customsFileId, user)
    const currentStatus = file.status as CustomsFileStatus

    const transitionCheck = verifyTransitionAllowed(
      currentStatus,
      input.newStatus,
      user.role
    )

    if (!transitionCheck.allowed) {
      return fail(transitionCheck.reason ?? 'Transition non autorisée.')
    }

    const supabaseAdmin = createSupabaseAdminClient()
    const clientIp = await getClientIp()

    const { data: updatedFile, error: updateError } = await supabaseAdmin
      .from('customs_files')
      .update({ status: input.newStatus })
      .eq('id', input.customsFileId)
      .select('id, status, updated_at')
      .single()

    if (updateError || !updatedFile) {
      console.error('[updateCustomsStatus] update', updateError)
      return fail('Erreur lors de la mise à jour du statut.')
    }

    const reasonTrimmed =
      input.newStatus === 'BLOCKED'
        ? input.reason!.trim()
        : input.reason?.trim() ?? null

    const { error: histError } = await supabaseAdmin
      .from('customs_status_history')
      .insert({
        customs_file_id: input.customsFileId,
        status_from: currentStatus,
        status_to: input.newStatus,
        changed_by: user.id,
        reason: reasonTrimmed,
        ip_address: clientIp,
      })

    if (histError) {
      console.error('[updateCustomsStatus] historique', histError)
    }

    return ok({
      customsFileId: input.customsFileId,
      previousStatus: currentStatus,
      newStatus: updatedFile.status as CustomsFileStatus,
      changedAt: updatedFile.updated_at,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.'
    console.error('[updateCustomsStatus]', message)
    return fail(message)
  }
}
