import { NextRequest } from 'next/server'
import { requireUser, handleApiError, ApiError } from '@/lib/auth-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { participantsDemande } from '@/lib/requests/participants'
import { genererFactureFinalePdf } from '@/components/invoices/final-invoice-pdf'

/**
 * PDF de la facture finale. Accès : administration ; client de la demande une
 * fois la facture émise. Tout autre appelant — partenaire compris — reçoit 404.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function un<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, role } = await requireUser()
    const { id } = await params
    if (!UUID.test(id)) throw new ApiError(400, 'Facture invalide')

    const admin = createAdminClient()
    const { data: facture } = await admin.from('invoices').select('*').eq('id', id).maybeSingle()
    if (!facture || facture.type !== 'FINAL') throw new ApiError(404, 'Facture introuvable')

    const participants = await participantsDemande(admin, facture.request_id)
    const estAdmin = role === 'ADMIN'
    const estClient = !!participants && participants.buyerId === user.id
    if (!participants || (!estAdmin && !(estClient && facture.status !== 'DRAFT'))) {
      throw new ApiError(404, 'Facture introuvable')
    }

    const [{ data: demande }, { data: po }] = await Promise.all([
      admin
        .from('import_requests')
        .select('reference, product_name, category, buyer:profiles!import_requests_buyer_id_fkey(full_name, company_name, email)')
        .eq('id', facture.request_id)
        .maybeSingle(),
      facture.purchase_order_id
        ? admin.from('purchase_orders').select('po_number, deposit_percent').eq('id', facture.purchase_order_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ])
    const acheteur = un((demande as any)?.buyer)

    const pdf = await genererFactureFinalePdf({
      numero: facture.number,
      statut: facture.status,
      emise_le: facture.issued_at ?? null,
      validee_le: facture.validated_at ?? null,
      reference_demande: demande?.reference ?? '—',
      bon_de_commande: (po as any)?.po_number ?? '—',
      devise: facture.currency ?? 'USD',
      pourcentage_acompte: (po as any)?.deposit_percent ?? 60,
      client: { nom: acheteur?.full_name ?? '—', societe: acheteur?.company_name, email: acheteur?.email },
      produit: demande?.product_name || demande?.category || 'Marchandise',
      lignes: Array.isArray(facture.lines) ? facture.lines : [],
      notes: facture.notes,
    })

    const nom = `facture-${String(facture.number).replace(/[^A-Za-z0-9-]/g, '')}.pdf`
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${nom}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    return handleApiError(error, { route: '/api/invoices/[id]/pdf', method: 'GET' })
  }
}
