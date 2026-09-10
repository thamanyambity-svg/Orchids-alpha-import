import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole, handleApiError, ApiError } from '@/lib/auth-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const decisionSchema = z
  .object({
    decision: z.enum(['VERIFIED', 'REJECTED']),
    motif: z.string().trim().max(1000).optional(),
  })
  .refine((d) => d.decision !== 'REJECTED' || (d.motif?.length ?? 0) >= 3, {
    message: 'Un refus doit être motivé',
  })

/**
 * Décision KYC sur un acheteur.
 *
 * La page d'administration écrivait `buyer_profiles.kyc_status` directement
 * depuis le navigateur. En RLS, l'administrateur n'a sur cette table qu'un
 * droit de lecture ; seul l'acheteur peut modifier sa propre ligne. L'UPDATE
 * touchait donc zéro ligne sans erreur, et la page affichait « KYC vérifié
 * avec succès » : aucune validation ni aucun refus n'a jamais été enregistré.
 *
 * La décision passe maintenant par ici : clé de service après contrôle du
 * rôle, et zéro ligne modifiée est une erreur, pas un succès. Le motif d'un
 * refus, faute de colonne dédiée, est conservé au journal d'audit.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireRole(['ADMIN'])
    const { id } = await params
    if (!UUID.test(id)) throw new ApiError(400, 'Identifiant invalide')

    const parsed = decisionSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Requête invalide')
    const { decision, motif } = parsed.data

    const { data, error } = await createAdminClient()
      .from('buyer_profiles')
      .update({ kyc_status: decision })
      .eq('user_id', id)
      .select('user_id, kyc_status')

    if (error) throw error
    if (!data?.length) throw new ApiError(404, 'Profil acheteur introuvable')

    await logAudit({
      actorId: user.id,
      action: decision === 'VERIFIED' ? 'KYC_VERIFIED' : 'KYC_REJECTED',
      targetType: 'buyer_profiles',
      targetId: id,
      details: motif ? { motif } : {},
    })

    return NextResponse.json({ success: true, kyc_status: data[0].kyc_status })
  } catch (error) {
    return handleApiError(error, { route: '/api/admin/buyers/[id]/kyc', method: 'PATCH' })
  }
}
