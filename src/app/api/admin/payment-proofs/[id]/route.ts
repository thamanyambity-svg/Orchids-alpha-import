import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole, handleApiError } from '@/lib/auth-guard'
import { logAudit } from '@/lib/audit'

/**
 * Un rejet doit être motivé sur au moins 10 caractères. La base impose déjà cette
 * règle (`chk_proof_rejection_reason`) ; on la répète ici pour renvoyer un message
 * exploitable plutôt qu'une violation de contrainte.
 */
const reviewSchema = z
  .object({
    decision: z.enum(['ACCEPT', 'REJECT']),
    rejected_reason: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.decision === 'REJECT' && (value.rejected_reason?.trim().length ?? 0) < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rejected_reason'],
        message: 'Le motif de refus doit faire au moins 10 caractères',
      })
    }
  })

/**
 * Décision de l'admin sur un justificatif de paiement.
 *
 * L'écriture est conditionnée au statut PENDING_REVIEW dans la clause WHERE, pas
 * seulement dans la lecture préalable : deux administrateurs ouvrant la même
 * preuve ne peuvent pas la trancher deux fois.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user } = await requireRole(['ADMIN'])
    const { id } = await params

    const parsed = reviewSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data: proof, error: readError } = await supabase
      .from('payment_proofs')
      .select('id, status, order_id, uploaded_by, user_id')
      .eq('id', id)
      .maybeSingle()

    if (readError) {
      console.error('[PATCH /api/admin/payment-proofs/:id]', readError)
      return NextResponse.json({ error: readError.message }, { status: 500 })
    }
    if (!proof) {
      return NextResponse.json({ error: 'Justificatif introuvable' }, { status: 404 })
    }
    if (proof.status !== 'PENDING_REVIEW') {
      return NextResponse.json({ error: 'Ce justificatif a déjà été traité' }, { status: 409 })
    }

    const accepted = parsed.data.decision === 'ACCEPT'
    const now = new Date().toISOString()

    const { data: updated, error: updateError } = await supabase
      .from('payment_proofs')
      .update({
        status: accepted ? 'ACCEPTED' : 'REJECTED',
        reviewed_by: user.id,
        reviewed_at: now,
        rejected_reason: accepted ? null : parsed.data.rejected_reason!.trim(),
        updated_at: now,
      })
      .eq('id', id)
      .eq('status', 'PENDING_REVIEW')
      .select('id')
      .maybeSingle()

    if (updateError) {
      console.error('[PATCH /api/admin/payment-proofs/:id]', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
    if (!updated) {
      return NextResponse.json({ error: 'Ce justificatif a déjà été traité' }, { status: 409 })
    }

    // Le déposant doit savoir que sa pièce a été tranchée : sans cela il attend
    // sans rien voir, et c'est le support qui encaisse.
    const recipient = proof.user_id ?? proof.uploaded_by
    if (recipient) {
      const { error: notifyError } = await supabase.from('notifications').insert({
        user_id: recipient,
        channel: 'payment',
        type: accepted ? 'success' : 'warning',
        title: accepted ? 'Justificatif de paiement validé' : 'Justificatif de paiement refusé',
        message: accepted
          ? 'Votre justificatif a été validé par l’équipe finance.'
          : `Votre justificatif a été refusé. Motif : ${parsed.data.rejected_reason!.trim()}`,
        link: '/dashboard/payments',
      })

      // Une notification perdue ne doit pas annuler une décision déjà écrite.
      if (notifyError) console.error('[payment-proof notification]', notifyError)
    }

    await logAudit({
      action: accepted ? 'PAYMENT_PROOF_ACCEPTED' : 'PAYMENT_PROOF_REJECTED',
      targetType: 'payment_proof',
      targetId: id,
      actorId: user.id,
      details: {
        order_id: proof.order_id,
        ...(accepted ? {} : { rejected_reason: parsed.data.rejected_reason!.trim() }),
      },
    })

    return NextResponse.json({ id, status: accepted ? 'ACCEPTED' : 'REJECTED' })
  } catch (error) {
    return handleApiError(error)
  }
}
