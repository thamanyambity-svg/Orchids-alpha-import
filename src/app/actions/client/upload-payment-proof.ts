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

export interface UploadPaymentProofInput {
  orderId: string
  file: File
  declaredAmount: number
  declaredCurrency: string
}

export interface UploadPaymentProofResult {
  proofId: string
  filePath: string
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
 * Premier envoi de preuve de paiement pour une commande (hors re-soumission).
 * Refuse s’il existe déjà une preuve PENDING_REVIEW, ACCEPTED ou REJECTED pour cette commande.
 */
export async function uploadPaymentProof(
  input: UploadPaymentProofInput
): Promise<ServerActionResult<UploadPaymentProofResult>> {
  try {
    const user = await requireAuthenticatedUser()

    if (!input.orderId?.trim()) {
      return fail('Commande invalide.')
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

    await verifyOrderOwnership(input.orderId.trim(), user.id)

    const supabaseAdmin = createSupabaseAdminClient()

    const { count: blockingCount, error: countErr } = await supabaseAdmin
      .from('payment_proofs')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', input.orderId.trim())
      .eq('user_id', user.id)
      .in('status', ['PENDING_REVIEW', 'ACCEPTED', 'REJECTED'])

    if (countErr) {
      console.error('[uploadPaymentProof] count', countErr)
      return fail('Impossible de vérifier les preuves existantes.')
    }
    if (blockingCount && blockingCount > 0) {
      return fail(
        'Une preuve existe déjà pour cette commande. Si elle a été refusée, utilisez « Soumettre une nouvelle preuve ».'
      )
    }

    if (
      !ALLOWED_MIME_TYPES.includes(
        input.file.type as (typeof ALLOWED_MIME_TYPES)[number]
      )
    ) {
      return fail(
        `Format non accepté : ${input.file.type}. Formats autorisés : JPEG, PNG, WEBP, PDF.`
      )
    }

    if (input.file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMo = (input.file.size / (1024 * 1024)).toFixed(1)
      return fail(`Fichier trop volumineux (${sizeMo} Mo). Taille maximale : 10 Mo.`)
    }

    const extension = getExtensionFromMimeType(input.file.type)
    const timestamp = Date.now()
    const newFilePath = `${user.id}/${input.orderId.trim()}/first-${timestamp}.${extension}`

    const fileBuffer = await input.file.arrayBuffer()

    const { error: storageError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(newFilePath, fileBuffer, {
        contentType: input.file.type,
        upsert: false,
        cacheControl: '3600',
      })

    if (storageError) {
      console.error('[uploadPaymentProof] Storage', storageError)
      return fail("Erreur lors de l'envoi du fichier. Veuillez réessayer.")
    }

    const insertPayload: Record<string, unknown> = {
      order_id: input.orderId.trim(),
      user_id: user.id,
      storage_bucket: STORAGE_BUCKET,
      file_path: newFilePath,
      file_name: input.file.name,
      amount_claimed: input.declaredAmount,
      currency: input.declaredCurrency.toUpperCase().trim(),
      status: 'PENDING_REVIEW',
      file_size_bytes: input.file.size,
      file_mime_type: input.file.type,
    }

    const { data: newProof, error: insertError } = await supabaseAdmin
      .from('payment_proofs')
      .insert(insertPayload)
      .select('id')
      .single()

    if (insertError || !newProof) {
      await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([newFilePath])
      console.error('[uploadPaymentProof] insert', insertError)
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
        title: 'Nouvelle preuve de paiement',
        message: `Un client a soumis une preuve pour la commande ${input.orderId.trim().slice(0, 8).toUpperCase()}.`,
        link: '/admin/payment-proofs',
      })
    }

    return ok({
      proofId: newProof.id,
      filePath: newFilePath,
      status: 'PENDING_REVIEW',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.'
    console.error('[uploadPaymentProof]', message)
    return fail(message)
  }
}
