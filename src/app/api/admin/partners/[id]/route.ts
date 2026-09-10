import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole, handleApiError, ApiError } from '@/lib/auth-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const modificationSchema = z.object({
  full_name: z.string().trim().min(2).max(200),
  company_name: z.string().trim().max(200).default(''),
  city: z.string().trim().max(120).default(''),
  status: z.enum(['PENDING', 'VERIFIED', 'SUSPENDED']),
  assigned_cities: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
  performance_score: z.number().min(0).max(5),
  contract_status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED']),
})

/**
 * Modification d'un partenaire. `[id]` est l'identifiant de la fiche
 * `partner_profiles`, comme pour la route sœur `access-link`.
 *
 * La fenêtre d'édition écrivait depuis le navigateur. La fiche partenaire
 * passait — l'administrateur a tous les droits dessus —, mais le profil non :
 * aucune politique ne l'autorise à modifier le profil d'un autre compte.
 * Nom, société, ville et statut étaient donc perdus sans erreur, pendant que
 * la fenêtre annonçait « Partenaire mis à jour ».
 *
 * Les deux écritures passent par la clé de service, et chacune doit toucher
 * sa ligne. Elles ne sont pas atomiques entre elles : la fiche est écrite
 * d'abord, et un profil introuvable est signalé plutôt que tu.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireRole(['ADMIN'])
    const { id } = await params
    if (!UUID.test(id)) throw new ApiError(400, 'Identifiant invalide')

    const parsed = modificationSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? 'Requête invalide')
    const d = parsed.data
    const admin = createAdminClient()

    const { data: fiche, error: erreurFiche } = await admin
      .from('partner_profiles')
      .update({
        assigned_cities: d.assigned_cities,
        performance_score: d.performance_score,
        contract_status: d.contract_status,
      })
      .eq('id', id)
      .select('id, user_id')

    if (erreurFiche) throw erreurFiche
    if (!fiche?.length) throw new ApiError(404, 'Partenaire introuvable')

    const { data: profil, error: erreurProfil } = await admin
      .from('profiles')
      .update({
        full_name: d.full_name,
        company_name: d.company_name || null,
        city: d.city || null,
        status: d.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fiche[0].user_id)
      .select('id')

    if (erreurProfil) throw erreurProfil
    if (!profil?.length) throw new ApiError(404, 'Profil du partenaire introuvable')

    await logAudit({
      actorId: user.id,
      action: 'UPDATE_PARTNER',
      targetType: 'partner_profiles',
      targetId: id,
      details: { contract_status: d.contract_status, status: d.status },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, { route: '/api/admin/partners/[id]', method: 'PATCH' })
  }
}
