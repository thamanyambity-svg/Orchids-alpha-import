'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/server-actions/admin-guard'
import { fail, ok, type ServerActionResult } from '@/lib/server-actions/result'
import { getRequestMeta } from '@/lib/server-actions/request-meta'

type ServerSupabase = Awaited<ReturnType<typeof createClient>>

export type PaymentProofAdminRow = {
  id: string
  order_id: string
  user_id: string
  storage_bucket: string
  file_path: string
  file_name: string | null
  amount_claimed: number | null
  currency: string
  status: string
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  created_at: string
  order_reference?: string | null
  user_email?: string | null
  user_full_name?: string | null
}

const reviewSchema = z
  .object({
    id: z.string().uuid(),
    decision: z.enum(['ACCEPT', 'REJECT']),
    rejectionReason: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.decision === 'REJECT') {
      const r = val.rejectionReason?.trim() ?? ''
      if (r.length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'La raison doit faire au moins 10 caractères',
          path: ['rejectionReason'],
        })
      }
    }
  })

const SIGNED_URL_TTL = 3600 // 1h

async function enrichProofRows(
  supabase: ServerSupabase,
  rows: Record<string, unknown>[]
): Promise<PaymentProofAdminRow[]> {
  if (!rows.length) return []
  const orderIds = [...new Set(rows.map((r) => r.order_id as string))]
  const userIds = [...new Set(rows.map((r) => r.user_id as string))]

  const [{ data: orders }, { data: profiles }] = await Promise.all([
    supabase.from('orders').select('id, reference').in('id', orderIds),
    supabase.from('profiles').select('id, email, full_name').in('id', userIds),
  ])

  const orderMap = new Map(orders?.map((o) => [o.id, o.reference]) ?? [])
  const profileMap = new Map(
    profiles?.map((p) => [p.id, { email: p.email, full_name: p.full_name }]) ??
      []
  )

  return rows.map((r) => {
    const row = r as Omit<PaymentProofAdminRow, 'order_reference' | 'user_email' | 'user_full_name'>
    const prof = profileMap.get(row.user_id)
    return {
      ...row,
      order_reference: orderMap.get(row.order_id) ?? null,
      user_email: prof?.email ?? null,
      user_full_name: prof?.full_name ?? null,
    }
  })
}

export async function getPendingProofs(): Promise<
  ServerActionResult<PaymentProofAdminRow[]>
> {
  const gate = await requireAdmin()
  if (!gate.success) return gate

  const { supabase } = gate.data
  const { data, error } = await supabase
    .from('payment_proofs')
    .select('*')
    .eq('status', 'PENDING_REVIEW')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getPendingProofs]', error)
    return fail(error.message)
  }

  return ok(await enrichProofRows(supabase, data ?? []))
}

export async function getRecentlyReviewedProofs(
  limit = 10
): Promise<ServerActionResult<PaymentProofAdminRow[]>> {
  const gate = await requireAdmin()
  if (!gate.success) return gate

  const { supabase } = gate.data
  const { data, error } = await supabase
    .from('payment_proofs')
    .select('*')
    .in('status', ['ACCEPTED', 'REJECTED'])
    .order('reviewed_at', { ascending: false })
    .limit(Math.min(50, limit))

  if (error) {
    console.error('[getRecentlyReviewedProofs]', error)
    return fail(error.message)
  }

  return ok(await enrichProofRows(supabase, data ?? []))
}

export async function getPendingProofsCount(): Promise<
  ServerActionResult<number>
> {
  const gate = await requireAdmin()
  if (!gate.success) return gate

  const { supabase } = gate.data
  const { count, error } = await supabase
    .from('payment_proofs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'PENDING_REVIEW')

  if (error) return fail(error.message)
  return ok(count ?? 0)
}

export async function reviewPaymentProof(
  raw: z.infer<typeof reviewSchema>
): Promise<ServerActionResult<{ ok: true }>> {
  const parsed = reviewSchema.safeParse(raw)
  if (!parsed.success) {
    const msg =
      parsed.error.issues[0]?.message ?? 'Données invalides'
    return fail(msg)
  }

  const gate = await requireAdmin()
  if (!gate.success) return gate

  const { supabase, userId } = gate.data
  const id = parsed.data.id

  const { data: existing, error: fetchErr } = await supabase
    .from('payment_proofs')
    .select('id, status, user_id, order_id')
    .eq('id', id)
    .single()

  if (fetchErr || !existing) {
    return fail('Preuve introuvable')
  }
  if (existing.status !== 'PENDING_REVIEW') {
    return fail('Cette preuve a déjà été traitée')
  }

  const now = new Date().toISOString()
  const newStatus =
    parsed.data.decision === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED'

  const { error: updErr } = await supabase
    .from('payment_proofs')
    .update({
      status: newStatus,
      reviewed_by: userId,
      reviewed_at: now,
      rejection_reason:
        parsed.data.decision === 'REJECT'
          ? parsed.data.rejectionReason
          : null,
      updated_at: now,
    })
    .eq('id', id)
    .eq('status', 'PENDING_REVIEW')

  if (updErr) {
    console.error('[reviewPaymentProof]', updErr)
    return fail(updErr.message)
  }

  const title =
    parsed.data.decision === 'ACCEPT'
      ? 'Preuve de paiement acceptée'
      : 'Preuve de paiement refusée'
  const message =
    parsed.data.decision === 'ACCEPT'
      ? 'Votre justificatif a été validé par l’équipe finance.'
      : `Votre justificatif a été refusé. Motif : ${parsed.data.decision === 'REJECT' ? parsed.data.rejectionReason : ''}`

  await supabase.from('notifications').insert({
    user_id: existing.user_id,
    title,
    message,
    type: 'INFO',
    link: '/dashboard/transactions',
  })

  revalidatePath('/admin/payment-proofs')
  return ok({ ok: true })
}

export async function getPaymentProofSignedUrl(
  proofId: string
): Promise<ServerActionResult<{ url: string; expiresIn: number }>> {
  const gate = await requireAdmin()
  if (!gate.success) return gate

  const { supabase, userId } = gate.data
  const { ip, userAgent } = await getRequestMeta()

  const { data: proof, error } = await supabase
    .from('payment_proofs')
    .select('id, storage_bucket, file_path, status')
    .eq('id', proofId)
    .single()

  if (error || !proof) {
    return fail('Preuve introuvable')
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from(proof.storage_bucket)
    .createSignedUrl(proof.file_path, SIGNED_URL_TTL)

  if (signErr || !signed?.signedUrl) {
    console.error('[getPaymentProofSignedUrl]', signErr)
    return fail(signErr?.message || 'Impossible de générer l’URL signée')
  }

  const { error: logErr } = await supabase.from('document_access_logs').insert({
    admin_id: userId,
    action: 'SIGNED_URL_GENERATED',
    document_type: 'payment_proof',
    document_id: proof.id,
    ip_address: ip,
    user_agent: userAgent,
    metadata: {
      bucket: proof.storage_bucket,
      path: proof.file_path,
      expires_in_seconds: SIGNED_URL_TTL,
    },
  })

  if (logErr) {
    console.error('[document_access_logs]', logErr)
    // On ne bloque pas l’accès si le log échoue, mais on signale
  }

  revalidatePath('/admin/audit-logs')
  return ok({ url: signed.signedUrl, expiresIn: SIGNED_URL_TTL })
}
