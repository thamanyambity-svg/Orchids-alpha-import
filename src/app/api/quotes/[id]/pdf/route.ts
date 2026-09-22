import { NextRequest } from 'next/server'
import { requireUser, handleApiError, ApiError } from '@/lib/auth-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { participantsDemande, estParticipant } from '@/lib/requests/participants'
import { visiblePourAcheteur } from '@/lib/quotes/workflow'
import { genererProFormaPdf } from '@/components/quotes/proforma-pdf'

/**
 * PDF d'une pro forma, produit à la demande.
 *
 * Accès : administration ; partenaire affecté ; client de la demande une fois
 * la pro forma transmise. Tout autre appelant reçoit 404.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function un<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, role } = await requireUser()
    const { id } = await params
    if (!UUID.test(id)) throw new ApiError(400, 'Pro forma invalide')

    const admin = createAdminClient()
    const { data: quote } = await admin.from('quotes').select('*').eq('id', id).maybeSingle()
    if (!quote) throw new ApiError(404, 'Pro forma introuvable')

    const participants = await participantsDemande(admin, quote.request_id)
    const estAdmin = role === 'ADMIN'
    const estPartenaire = !!participants && participants.partnerUserId === user.id
    const estClient = !!participants && participants.buyerId === user.id
    const autorise = estAdmin || estPartenaire || (estClient && visiblePourAcheteur(quote))
    if (!participants || !autorise || (!estAdmin && !estParticipant(participants, user.id))) {
      throw new ApiError(404, 'Pro forma introuvable')
    }

    const { data: demande } = await admin
      .from('import_requests')
      .select('reference, product_name, category, transport_mode, buyer:profiles!import_requests_buyer_id_fkey(full_name, company_name, email)')
      .eq('id', quote.request_id)
      .maybeSingle()
    const { data: fiche } = participants.partnerProfileId
      ? await admin
          .from('partner_profiles')
          .select('user:profiles!partner_profiles_user_id_fkey(full_name, company_name), country:countries(name)')
          .eq('id', quote.partner_id ?? participants.partnerProfileId)
          .maybeSingle()
      : { data: null }

    const acheteur = un((demande as any)?.buyer)
    const compte = un((fiche as any)?.user)
    const pays = un((fiche as any)?.country)

    const pdf = await genererProFormaPdf({
      reference: demande?.reference ?? '—',
      version: quote.version,
      statut: quote.status,
      emise_le: quote.submitted_at ?? quote.created_at ?? null,
      valable_jusqu_au: quote.valid_until ?? null,
      client: { nom: acheteur?.full_name ?? '—', societe: acheteur?.company_name, email: acheteur?.email },
      partenaire: { societe: compte?.company_name || compte?.full_name || '—', pays: pays?.name ?? null },
      produit: demande?.product_name || demande?.category || 'Marchandise',
      categorie: demande?.product_name ? demande?.category : null,
      transport: demande?.transport_mode ?? null,
      quote,
    })

    const nom = `proforma-${(demande?.reference ?? 'demande').replace(/[^A-Za-z0-9-]/g, '')}-v${quote.version}.pdf`
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${nom}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    return handleApiError(error, { route: '/api/quotes/[id]/pdf', method: 'GET' })
  }
}
