import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, handleApiError, ApiError } from '@/lib/auth-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import { sendToN8N } from '@/lib/webhooks'
import { participantsDemande } from '@/lib/requests/participants'
import { motifRefusLignes, totauxFacture, type LigneFacture } from '@/lib/invoices/final'
import { formatMontant } from '@/lib/quotes/workflow'
import { idsAdmins, notifier, messageDossier } from '@/lib/quotes/effets'

/**
 * Étapes de la facture finale.
 *
 * - `issue` (administration) : le brouillon est émis au client.
 * - `validate` (client, CGV acceptées) : vaut signature du bon de commande ;
 *   la commande passe « en attente d'acompte » avec ses montants 60 / 40, et
 *   le paiement de l'acompte s'ouvre. Rien n'est payable avant cette étape.
 * - `contest` (client, motif) : la facture redevient un brouillon que
 *   l'administration corrige.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VERSION_CGV = '1.0'

const schema = z.object({
  action: z.enum(['issue', 'validate', 'contest']),
  motif: z.string().trim().max(1000).optional(),
  cgv_accepted: z.boolean().optional(),
})

type Contexte = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Contexte) {
  try {
    const { user, role } = await requireUser()
    const { id } = await params
    if (!UUID.test(id)) throw new ApiError(400, 'Facture invalide')

    const rl = checkRateLimit(`invoice-decision:${user.id}`, { maxRequests: 20, windowMs: 60000 })
    if (!rl.allowed) throw new ApiError(429, 'Trop de tentatives, patientez une minute')

    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw new ApiError(400, 'Décision invalide')
    const { action } = parsed.data
    const motif = parsed.data.motif ?? ''

    const admin = createAdminClient()
    const { data: facture } = await admin.from('invoices').select('*').eq('id', id).maybeSingle()
    if (!facture || facture.type !== 'FINAL') throw new ApiError(404, 'Facture introuvable')

    const participants = await participantsDemande(admin, facture.request_id)
    const estAdmin = role === 'ADMIN'
    const estClient = !!participants && participants.buyerId === user.id
    // Le client ne voit pas un brouillon ; le partenaire n'a pas accès à la facture finale.
    if (!participants || (!estAdmin && !(estClient && facture.status !== 'DRAFT'))) {
      throw new ApiError(404, 'Facture introuvable')
    }

    const lignes: LigneFacture[] = Array.isArray(facture.lines) ? facture.lines : []
    const maintenant = new Date().toISOString()
    const devise = facture.currency ?? 'USD'
    const { data: demande } = await admin.from('import_requests').select('reference').eq('id', facture.request_id).maybeSingle()
    const ref = demande?.reference ?? ''
    const client = { id: participants.buyerId, espace: 'BUYER' as const }
    const partenaire = { id: participants.partnerUserId, espace: 'PARTNER' as const }
    const admins = (await idsAdmins(admin)).map((a) => ({ id: a, espace: 'ADMIN' as const }))

    if (action === 'issue') {
      if (!estAdmin) throw new ApiError(403, "L'émission est réservée à l'administration")
      if (facture.status !== 'DRAFT') throw new ApiError(409, 'Cette facture a déjà été émise')
      const refus = motifRefusLignes(lignes)
      if (refus) throw new ApiError(400, refus)

      const { data: maj } = await admin
        .from('invoices')
        .update({ status: 'SENT', issued_at: maintenant, contest_reason: null })
        .eq('id', id)
        .eq('status', 'DRAFT')
        .select()
        .maybeSingle()
      if (!maj) throw new ApiError(409, "La facture vient d'être modifiée, rechargez la page")

      await notifier(admin, facture.request_id, [client], {
        title: 'Votre facture finale est disponible',
        onglet: 'invoice',
        message: `Facture ${facture.number} (${ref}) : ${formatMontant(facture.total_amount, devise)}, dont acompte de 60 % : ${formatMontant(facture.deposit_amount, devise)}. Vérifiez-la puis validez-la pour ouvrir le paiement.`,
        type: 'success',
      })
      await messageDossier(
        admin,
        facture.request_id,
        user.id,
        `Facture finale ${facture.number} émise au client. Elle détaille marchandise, transport, droits et taxes RDC et frais ; le paiement de l'acompte s'ouvre à sa validation.`
      )
      await logAudit({ actorId: user.id, action: 'ISSUE_FINAL_INVOICE', targetType: 'invoices', targetId: id, details: { total: facture.total_amount } })
      return NextResponse.json({ invoice: maj })
    }

    // validate / contest : le client de la demande, sur une facture émise non encore validée.
    if (!estClient) throw new ApiError(403, 'Décision réservée au client de la demande')
    if (facture.status !== 'SENT' || facture.validated_at) throw new ApiError(409, "Cette facture n'attend plus votre décision")

    if (action === 'contest') {
      if (motif.length < 3) throw new ApiError(400, 'Précisez ce qui doit être corrigé')
      const { data: maj } = await admin
        .from('invoices')
        .update({ status: 'DRAFT', contest_reason: motif })
        .eq('id', id)
        .eq('status', 'SENT')
        .is('validated_at', null)
        .select()
        .maybeSingle()
      if (!maj) throw new ApiError(409, "La facture vient d'être modifiée, rechargez la page")

      await notifier(admin, facture.request_id, admins, {
        title: 'Facture finale contestée',
        message: `Le client demande une correction de la facture ${facture.number} (${ref}) : ${motif}`,
        type: 'warning',
      })
      await messageDossier(admin, facture.request_id, user.id, `Correction demandée sur la facture finale : ${motif}`)
      await logAudit({ actorId: user.id, action: 'CONTEST_FINAL_INVOICE', targetType: 'invoices', targetId: id, details: { motif } })
      return NextResponse.json({ invoice: maj })
    }

    // validate
    if (parsed.data.cgv_accepted !== true) throw new ApiError(400, 'Acceptez les conditions générales de vente pour valider')
    const { data: po } = facture.purchase_order_id
      ? await admin.from('purchase_orders').select('id, po_number, status, deposit_percent').eq('id', facture.purchase_order_id).maybeSingle()
      : { data: null }
    if (!po || !['GENERATED', 'PENDING_SIGNATURE', 'SIGNED'].includes(po.status)) {
      throw new ApiError(409, "Le bon de commande de cette facture n'est plus signable")
    }

    const { data: validee } = await admin
      .from('invoices')
      .update({ validated_at: maintenant })
      .eq('id', id)
      .eq('status', 'SENT')
      .is('validated_at', null)
      .select()
      .maybeSingle()
    if (!validee) throw new ApiError(409, "La facture vient d'être modifiée, rechargez la page")

    const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null
    await admin
      .from('purchase_orders')
      .update({
        status: 'SIGNED',
        cgv_accepted_at: maintenant,
        cgv_version: VERSION_CGV,
        cgv_accepted_ip: ip,
        cgv_accepted_user_agent: (request.headers.get('user-agent') ?? '').slice(0, 300) || null,
      })
      .eq('id', po.id)

    const t = totauxFacture(lignes, po.deposit_percent ?? 60)
    const { data: commande } = await admin
      .from('orders')
      .update({
        status: 'AWAITING_DEPOSIT',
        total_amount: t.total,
        alpha_commission: t.commission,
        deposit_amount: t.acompte,
        balance_amount: t.solde,
        validated_by_admin: true,
      })
      .eq('id', facture.order_id)
      .eq('status', 'PENDING')
      .select('id, reference, deposit_amount')
      .maybeSingle()

    await admin.from('import_requests').update({ status: 'AWAITING_DEPOSIT' }).eq('id', facture.request_id)

    await notifier(admin, facture.request_id, [...admins, partenaire], {
      title: 'Facture finale validée',
      message: `Le client a validé la facture ${facture.number} (${ref}) et signé le bon de commande ${po.po_number}. Acompte attendu : ${formatMontant(t.acompte, devise)}.`,
      type: 'success',
    }, user.id)
    await messageDossier(
      admin,
      facture.request_id,
      user.id,
      `Facture finale validée et bon de commande ${po.po_number} signé. Acompte de 60 % à régler dans l'onglet « Facture & paiement ».`
    )
    await logAudit({
      actorId: user.id,
      action: 'VALIDATE_FINAL_INVOICE',
      targetType: 'invoices',
      targetId: id,
      details: { po: po.po_number, cgv_version: VERSION_CGV, cgv_ip: ip, acompte: t.acompte, commande: commande?.reference },
    })
    await sendToN8N('final_invoice_validated', { invoiceId: id, requestId: facture.request_id, orderId: facture.order_id }).catch(() => undefined)

    return NextResponse.json({ invoice: validee, order: commande ?? null })
  } catch (error) {
    return handleApiError(error, { route: '/api/invoices/[id]/decision', method: 'POST' })
  }
}
