import { NextRequest, NextResponse } from 'next/server'
import { requireRole, handleApiError } from '@/lib/auth-guard'
import type { SupabaseClient } from '@supabase/supabase-js'

export type PaymentProofRow = {
  id: string
  order_id: string
  transaction_id: string | null
  uploaded_by: string
  user_id: string | null
  file_path: string
  file_name_original: string | null
  file_size_bytes: number | null
  file_mime_type: string | null
  declared_amount: number | null
  declared_currency: string | null
  status: 'PENDING_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'SUPERSEDED'
  rejected_reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  uploaded_at: string
  created_at: string
  order_reference: string | null
  uploader_email: string | null
  uploader_full_name: string | null
}

const REVIEWED_STATUSES = ['ACCEPTED', 'REJECTED'] as const
const MAX_REVIEWED = 50

/**
 * Les libellés lisibles (référence de commande, identité du déposant) vivent dans
 * d'autres tables. On les résout en deux requêtes groupées plutôt qu'une jointure
 * imbriquée, pour ne pas dépendre du nom des contraintes de clé étrangère — c'est
 * ce qui avait cassé les vues partenaire par le passé.
 */
async function enrich(
  supabase: SupabaseClient,
  rows: Record<string, unknown>[]
): Promise<PaymentProofRow[]> {
  if (!rows.length) return []

  const orderIds = [...new Set(rows.map((r) => r.order_id as string).filter(Boolean))]
  const profileIds = [
    ...new Set(
      rows
        .flatMap((r) => [r.uploaded_by as string | null, r.user_id as string | null])
        .filter((id): id is string => Boolean(id))
    ),
  ]

  const [{ data: orders }, { data: profiles }] = await Promise.all([
    orderIds.length
      ? supabase.from('orders').select('id, reference').in('id', orderIds)
      : Promise.resolve({ data: [] as { id: string; reference: string }[] }),
    profileIds.length
      ? supabase.from('profiles').select('id, email, full_name').in('id', profileIds)
      : Promise.resolve({ data: [] as { id: string; email: string; full_name: string }[] }),
  ])

  const orderRefs = new Map((orders ?? []).map((o) => [o.id, o.reference]))
  const people = new Map((profiles ?? []).map((p) => [p.id, p]))

  return rows.map((row) => {
    const proof = row as unknown as PaymentProofRow
    const uploader = people.get(proof.uploaded_by) ?? (proof.user_id ? people.get(proof.user_id) : undefined)

    return {
      ...proof,
      order_reference: orderRefs.get(proof.order_id) ?? null,
      uploader_email: uploader?.email ?? null,
      uploader_full_name: uploader?.full_name ?? null,
    }
  })
}

/**
 * Liste les justificatifs de paiement pour la revue admin.
 *
 * `?status=pending` (défaut) renvoie la file d'attente, la plus ancienne en tête :
 * un dépôt en attente bloque une commande, l'ordre d'arrivée est donc le bon.
 * `?status=reviewed` renvoie les dernières décisions, pour pouvoir les relire.
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireRole(['ADMIN'])

    const status = new URL(request.url).searchParams.get('status') ?? 'pending'

    const query =
      status === 'reviewed'
        ? supabase
            .from('payment_proofs')
            .select('*')
            .in('status', REVIEWED_STATUSES)
            .order('reviewed_at', { ascending: false })
            .limit(MAX_REVIEWED)
        : supabase
            .from('payment_proofs')
            .select('*')
            .eq('status', 'PENDING_REVIEW')
            .order('uploaded_at', { ascending: true })

    const { data, error } = await query

    if (error) {
      console.error('[GET /api/admin/payment-proofs]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ proofs: await enrich(supabase, data ?? []) })
  } catch (error) {
    return handleApiError(error)
  }
}
