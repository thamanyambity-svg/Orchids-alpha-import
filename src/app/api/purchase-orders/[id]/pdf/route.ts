import { NextRequest } from 'next/server'
import { requireUser, handleApiError, ApiError } from '@/lib/auth-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { participantsDemande, estParticipant } from '@/lib/requests/participants'
import { genererBonDeCommandePdf } from '@/components/orders/purchase-order-pdf'

/**
 * PDF du bon de commande.
 *
 * La carte du dossier proposait un lien vers un fichier qui n'existait pas :
 * le bon de commande n'avait aucun document imprimable. Accès : l'acheteur du
 * dossier, le partenaire affecté et l'administration.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function un<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, role } = await requireUser()
    const { id } = await params
    if (!UUID.test(id)) throw new ApiError(400, 'Bon de commande invalide')

    const admin = createAdminClient()
    const { data: bc } = await admin.from('purchase_orders').select('*').eq('id', id).maybeSingle()
    if (!bc) throw new ApiError(404, 'Bon de commande introuvable')

    const participants = await participantsDemande(admin, bc.request_id)
    const estAdmin = role === 'ADMIN'
    if (!participants || (!estAdmin && !estParticipant(participants, user.id))) {
      throw new ApiError(404, 'Bon de commande introuvable')
    }

    const [{ data: demande }, { data: devis }, { data: fiche }] = await Promise.all([
      admin
        .from('import_requests')
        .select('reference, product_name, category, buyer:profiles!import_requests_buyer_id_fkey(full_name, company_name, email, city)')
        .eq('id', bc.request_id)
        .maybeSingle(),
      bc.quote_id
        ? admin.from('quotes').select('*').eq('id', bc.quote_id).maybeSingle()
        : Promise.resolve({ data: null }),
      bc.partner_id
        ? admin
            .from('partner_profiles')
            .select('user:profiles!partner_profiles_user_id_fkey(full_name, company_name), country:countries(name)')
            .eq('id', bc.partner_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const acheteur = un((demande as any)?.buyer)
    const compte = un((fiche as any)?.user)
    const pays = un((fiche as any)?.country)
    const q = devis as any

    const pdf = await genererBonDeCommandePdf({
      numero: bc.po_number,
      statut: bc.status,
      emis_le: bc.created_at ?? null,
      devise: bc.currency ?? 'USD',
      reference_demande: demande?.reference ?? '—',
      pro_forma: q ? `${demande?.reference ?? ''}-PF${String(q.version).padStart(2, '0')}` : null,
      pourcentage_acompte: bc.deposit_percent ?? 60,
      pourcentage_solde: bc.balance_percent ?? 40,
      total: Number(bc.grand_total_usd ?? 0),
      client: {
        nom: acheteur?.full_name ?? '—',
        societe: acheteur?.company_name,
        email: acheteur?.email,
        ville: acheteur?.city,
      },
      partenaire: { societe: compte?.company_name || compte?.full_name || '—', pays: pays?.name ?? null },
      produit: demande?.product_name || demande?.category || 'Marchandise',
      quote: q,
      signature: bc.cgv_accepted_at
        ? { le: bc.cgv_accepted_at, version: bc.cgv_version ?? null, adresse: bc.cgv_accepted_ip ?? null }
        : null,
    })

    const nom = `bon-de-commande-${String(bc.po_number).replace(/[^A-Za-z0-9-]/g, '')}.pdf`
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${nom}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    return handleApiError(error, { route: '/api/purchase-orders/[id]/pdf', method: 'GET' })
  }
}
