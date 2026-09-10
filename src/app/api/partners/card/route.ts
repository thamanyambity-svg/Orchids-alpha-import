import { NextRequest, NextResponse } from 'next/server'
import { requireUser, handleApiError, ApiError } from '@/lib/auth-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { PARTNER_CARD_SELECT, toPartnerCard } from '@/lib/partners/public-card'

/**
 * Carte de contact du partenaire, pour un acheteur connecté.
 *
 * Deux usages :
 * - `?country=AE` — le partenaire actif d'un pays d'achat, affiché dans le
 *   formulaire de demande dès que le client choisit ce pays ;
 * - `?request=latest` — le partenaire affecté à la dernière demande de
 *   l'appelant, affiché sur son tableau de bord.
 *
 * La lecture passe par la clé de service parce que les règles d'accès
 * n'ouvrent `partner_profiles` et `profiles` qu'à leur propriétaire et à
 * l'administration. Plutôt que d'élargir ces règles — ce qui rendrait lisibles
 * commission, caution et adresse —, cette route renvoie la seule carte de
 * contact, et seulement pour un contrat actif.
 *
 * Le cas `latest` filtre par `buyer_id = appelant` : un acheteur ne peut pas
 * obtenir le partenaire de la demande d'un autre.
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireUser()
    const params = new URL(request.url).searchParams
    const pays = params.get('country')
    const mode = params.get('request')
    const admin = createAdminClient()

    if (pays !== null) {
      if (!/^[A-Z]{2}$/.test(pays)) throw new ApiError(400, 'Code pays invalide')

      const { data: ligne } = await admin.from('countries').select('id').eq('code', pays).maybeSingle()
      if (!ligne) return NextResponse.json({ partner: null })

      const { data } = await admin
        .from('partner_profiles')
        .select(PARTNER_CARD_SELECT)
        .eq('country_id', ligne.id)
        .eq('contract_status', 'ACTIVE')
        .limit(1)
        .maybeSingle()

      return NextResponse.json({ partner: toPartnerCard(data) })
    }

    if (mode === 'latest') {
      const { data: demande } = await admin
        .from('import_requests')
        .select('assigned_partner_id')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!demande?.assigned_partner_id) return NextResponse.json({ partner: null })

      const { data } = await admin
        .from('partner_profiles')
        .select(PARTNER_CARD_SELECT)
        .eq('id', demande.assigned_partner_id)
        .eq('contract_status', 'ACTIVE')
        .maybeSingle()

      return NextResponse.json({ partner: toPartnerCard(data) })
    }

    throw new ApiError(400, 'Préciser ?country=XX ou ?request=latest')
  } catch (error) {
    return handleApiError(error, { route: '/api/partners/card', method: 'GET' })
  }
}
