'use server'

import { createClient } from '@supabase/supabase-js'
import { ok, fail } from '@/lib/server-actions/result'
import type { ServerActionResult } from '@/lib/server-actions/result'
import {
  requireAuthenticatedUser,
  verifyOrderOwnership,
} from '@/lib/server-actions/client-guard'

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

const STORAGE_BUCKET = 'payment-proofs'

export interface ResubmitPaymentProofInput {
  rejectedProofId: string
  file: File
  declaredAmount: number
  declaredCurrency: string
}

export interface ResubmitPaymentProofResult {
  newProofId: string
  newFilePath: string
  supersededProofId: string
  status: 'PENDING_REVIEW'
}

function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Configuration serveur Supabase incomplète.')
  }
  return createClient(url, key)
}

function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
  }
  return map[mimeType] ?? 'bin'
}

/**
 * Re-soumet une preuve de paiement après un rejet admin.
 *
 * Schéma aligné sur `payment_proofs` : user_id, amount_claimed, currency,
 * supersedes_proof_id (migration 20260323130000).
 *
 * TRIGGER SQL : `trg_supersede_rejected_proof` met l’ancienne preuve en SUPERSEDED
 * lorsque `supersedes_proof_id` est renseigné.
 */
export async function resubmitPaymentProof(
  input: ResubmitPaymentProofInput
): Promise<ServerActionResult<ResubmitPaymentProofResult>> {
  try {
    const user = await requireAuthenticatedUser()

    if (!input.rejectedProofId?.trim()) {
      return fail('Identifiant de preuve manquant.')
    }
    if (!input.file) {
      return fail('Aucun fichier sélectionné.')
    }
    if (input.declaredAmount <= 0) {
      return fail('Le montant déclaré doit être strictement positif.')
    }
    if (!input.declaredCurrency?.trim()) {
      return fail('La devise déclarée est obligatoire.')
    }

    const supabaseAdmin = createSupabaseAdminClient()

    const { data: rejectedProof, error: proofFetchError } = await supabaseAdmin
      .from('payment_proofs')
      .select('id, status, user_id, order_id, transaction_id')
      .eq('id', input.rejectedProofId.trim())
      .single()

    if (proofFetchError || !rejectedProof) {
      return fail('Preuve introuvable.')
    }

    if (rejectedProof.user_id !== user.id) {
      console.warn(
        `[resubmitPaymentProof] Accès refusé : user=${user.id} proof=${input.rejectedProofId} owner=${rejectedProof.user_id}`
      )
      return fail('Preuve introuvable.')
    }

    if (rejectedProof.status !== 'REJECTED') {
      return fail(
        `Cette preuve ne peut pas être remplacée (statut actuel : ${rejectedProof.status}). ` +
          `Seules les preuves rejetées peuvent être re-soumises.`
      )
    }

    await verifyOrderOwnership(rejectedProof.order_id, user.id)

    if (
      !ALLOWED_MIME_TYPES.includes(
        input.file.type as (typeof ALLOWED_MIME_TYPES)[number]
      )
    ) {
      return fail(
        `Format non accepté : ${input.file.type}. ` +
          `Formats autorisés : JPEG, PNG, WEBP, PDF.`
      )
    }

    if (input.file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMo = (input.file.size / (1024 * 1024)).toFixed(1)
      return fail(
        `Fichier trop volumineux (${sizeMo} Mo). Taille maximale : 10 Mo.`
      )
    }

    const extension = getExtensionFromMimeType(input.file.type)
    const timestamp = Date.now()
    const txPart = rejectedProof.transaction_id ?? 'notx'
    const newFilePath = `${user.id}/${rejectedProof.order_id}/${txPart}-${timestamp}.${extension}`

    const fileBuffer = await input.file.arrayBuffer()

    const { error: storageError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(newFilePath, fileBuffer, {
        contentType: input.file.type,
        upsert: false,
        cacheControl: '3600',
      })

    if (storageError) {
      console.error('[resubmitPaymentProof] Erreur Storage :', storageError)
      return fail("Erreur lors de l'envoi du fichier. Veuillez réessayer.")
    }

    const insertPayload: Record<string, unknown> = {
      order_id: rejectedProof.order_id,
      user_id: user.id,
      storage_bucket: STORAGE_BUCKET,
      file_path: newFilePath,
      file_name: input.file.name,
      amount_claimed: input.declaredAmount,
      currency: input.declaredCurrency.toUpperCase().trim(),
      status: 'PENDING_REVIEW',
      supersedes_proof_id: input.rejectedProofId.trim(),
      file_size_bytes: input.file.size,
      file_mime_type: input.file.type,
    }

    if (rejectedProof.transaction_id) {
      insertPayload.transaction_id = rejectedProof.transaction_id
    }

    const { data: newProof, error: insertError } = await supabaseAdmin
      .from('payment_proofs')
      .insert(insertPayload)
      .select('id')
      .single()

    if (insertError || !newProof) {
      await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([newFilePath])
      console.error('[resubmitPaymentProof] Erreur insertion :', insertError)
      return fail("Erreur lors de l'enregistrement. Veuillez réessayer.")
    }

    const { data: adminRow } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'ADMIN')
      .limit(1)
      .maybeSingle()

    if (adminRow?.id) {
      await supabaseAdmin.from('notifications').insert({
        user_id: adminRow.id,
        type: 'INFO',
        title: 'Preuve de paiement re-soumise',
        message: `Un client a soumis une nouvelle preuve après rejet (commande ${rejectedProof.order_id.slice(0, 8).toUpperCase()}).`,
        link: '/admin/payment-proofs',
      })
    }

    return ok({
      newProofId: newProof.id,
      newFilePath,
      supersededProofId: input.rejectedProofId.trim(),
      status: 'PENDING_REVIEW',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.'
    console.error('[resubmitPaymentProof] Erreur :', message)
    return fail(message)
  }
}
