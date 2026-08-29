import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole, handleApiError } from '@/lib/auth-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'
import { verifyTransitionAllowed } from '@/lib/customs/transition-matrix'
import { isCustomsFileStatus } from '@/lib/customs/status-display'
import { checkCustomsTransitionGuards } from '@/lib/customs/compliance-guards'
import type { CustomsFileStatus } from '@/lib/customs/types'

const MIN_BLOCK_REASON = 10

const statusSchema = z.object({
  status: z.string().refine(isCustomsFileStatus, { message: 'Statut douanier inconnu' }),
  reason: z.string().optional(),
})

/**
 * Changement de statut d'un dossier douanier.
 *
 * Trois contrôles successifs, dans cet ordre : le rôle a-t-il le droit de faire
 * cette transition (matrice), le dossier est-il en état de la subir (gardes de
 * conformité fiscale et comptable), puis l'écriture. Un blocage doit être motivé
 * — c'est la seule trace de la raison pour laquelle une marchandise s'arrête.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user, role } = await requireRole(['ADMIN', 'PARTNER'])
    const { id } = await params

    const parsed = statusSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid payload' },
        { status: 400 }
      )
    }

    const newStatus = parsed.data.status as CustomsFileStatus
    const reason = parsed.data.reason?.trim() ?? ''

    if (newStatus === 'BLOCKED' && reason.length < MIN_BLOCK_REASON) {
      return NextResponse.json(
        { error: `Le motif de blocage est obligatoire et doit faire au moins ${MIN_BLOCK_REASON} caractères` },
        { status: 400 }
      )
    }

    const { data: file, error: readError } = await supabase
      .from('customs_files')
      .select('id, status, order_id')
      .eq('id', id)
      .maybeSingle()

    if (readError) {
      console.error('[PATCH /api/customs/files/:id/status]', readError)
      return NextResponse.json({ error: readError.message }, { status: 500 })
    }
    if (!file) {
      return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
    }

    const currentStatus = file.status as CustomsFileStatus

    const transition = verifyTransitionAllowed(currentStatus, newStatus, role)
    if (!transition.allowed) {
      return NextResponse.json({ error: transition.reason }, { status: 403 })
    }

    const compliance = await checkCustomsTransitionGuards(supabase, id, currentStatus, newStatus)
    if (!compliance.allowed) {
      return NextResponse.json({ error: compliance.reason }, { status: 409 })
    }

    const { data: updated, error: updateError } = await supabase
      .from('customs_files')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      // Le statut lu plus haut fait partie de la condition : deux agents qui
      // ouvrent le dossier en même temps ne peuvent pas enchaîner deux
      // transitions à partir du même état.
      .eq('status', currentStatus)
      .select('id, status, updated_at')
      .maybeSingle()

    if (updateError) {
      console.error('[PATCH /api/customs/files/:id/status]', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
    if (!updated) {
      return NextResponse.json(
        { error: 'Le dossier a changé de statut entre-temps, rechargez-le' },
        { status: 409 }
      )
    }

    // L'historique est un journal système : il n'a pas de policy INSERT, pour
    // qu'aucun acteur ne puisse y écrire une ligne de son cru. On l'alimente par
    // le client de service, comme les journaux d'audit.
    const { error: historyError } = await createAdminClient()
      .from('customs_status_history')
      .insert({
        customs_file_id: id,
        status_from: currentStatus,
        status_to: newStatus,
        changed_by: user.id,
        reason: reason || null,
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      })

    if (historyError) console.error('[customs_status_history]', historyError)

    await logAudit({
      action: 'CUSTOMS_STATUS_CHANGED',
      targetType: 'customs_file',
      targetId: id,
      actorId: user.id,
      details: { from: currentStatus, to: newStatus, ...(reason ? { reason } : {}) },
    })

    return NextResponse.json({
      id,
      previous_status: currentStatus,
      status: updated.status,
      changed_at: updated.updated_at,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
