import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, handleApiError } from '@/lib/auth-guard'
import { checkRateLimit } from '@/lib/rate-limit'

const createProofSchema = z.object({
  order_id: z.string().uuid(),
  file_path: z.string().min(1),
  file_name_original: z.string().min(1).optional(),
  file_size_bytes: z.number().int().positive().optional(),
  file_mime_type: z.string().min(1).optional(),
  declared_amount: z.number().positive().optional(),
  declared_currency: z.string().length(3).optional(),
  supersedes_proof_id: z.string().uuid().optional(),
})

/**
 * Dépôt d'un justificatif de paiement par l'acheteur.
 *
 * Le fichier est envoyé au stockage par le client ; cette route n'enregistre que
 * la ligne. C'est la policy `payment_proofs_insert_own` qui garantit que la
 * commande visée appartient bien à l'acheteur — on ne refait pas ce contrôle ici
 * pour éviter deux vérités sur la même règle.
 *
 * Une re-soumission cite la preuve refusée dans `supersedes_proof_id` : le
 * trigger `trg_supersede_rejected_proof` bascule alors l'ancienne en SUPERSEDED,
 * pour que l'historique reste lisible au lieu d'accumuler des rejets orphelins.
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser()

    const rl = checkRateLimit(`payment-proof:${user.id}`, { maxRequests: 10, windowMs: 60000 })
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const parsed = createProofSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('payment_proofs')
      .insert({
        ...parsed.data,
        uploaded_by: user.id,
        user_id: user.id,
        status: 'PENDING_REVIEW',
      })
      .select('id, status, uploaded_at')
      .single()

    if (error) {
      console.error('[POST /api/payment-proofs]', error)
      // Une violation de policy signifie que la commande n'est pas celle de
      // l'acheteur : c'est un 403, pas une erreur serveur.
      const status = error.code === '42501' ? 403 : 500
      return NextResponse.json(
        { error: status === 403 ? 'Cette commande ne vous appartient pas' : error.message },
        { status }
      )
    }

    return NextResponse.json({ proof: data }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * Justificatifs déposés par l'acheteur courant, du plus récent au plus ancien.
 */
export async function GET() {
  try {
    const { supabase, user } = await requireUser()

    const { data, error } = await supabase
      .from('payment_proofs')
      .select(
        'id, order_id, file_name_original, declared_amount, declared_currency, status, rejected_reason, reviewed_at, uploaded_at'
      )
      .eq('uploaded_by', user.id)
      .order('uploaded_at', { ascending: false })

    if (error) {
      console.error('[GET /api/payment-proofs]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ proofs: data ?? [] })
  } catch (error) {
    return handleApiError(error)
  }
}
