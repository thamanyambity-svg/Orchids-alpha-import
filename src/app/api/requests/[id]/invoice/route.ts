import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, handleApiError, ApiError } from '@/lib/auth-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import { participantsDemande, estParticipant } from '@/lib/requests/participants'
import {
  CATEGORIES,
  lignesDepuisProForma,
  totauxFacture,
  numeroFacture,
  motifRefusLignes,
  type LigneFacture,
} from '@/lib/invoices/final'

/**
 * Facture finale d'une demande.
 *
 * GET — l'administration voit tout, avec une proposition de lignes tirée de
 * la pro forma acceptée tant qu'aucune facture n'existe ; le client ne voit la
 * facture qu'une fois émise. Le partenaire n'y a pas accès : la facture finale
 * est la relation commerciale entre Alpha Import et son client.
 *
 * PUT — l'administration enregistre le brouillon. Au premier enregistrement,
 * la commande naît en attente (PENDING, sans acompte exigible) et se rattache
 * au bon de commande : elle ne deviendra payable qu'à la validation du client.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const schemaBrouillon = z.object({
  lines: z
    .array(
      z.object({
        libelle: z.string().trim().min(2).max(160),
        categorie: z.enum(CATEGORIES),
        montant: z.number().min(0).max(1e9),
      })
    )
    .min(1)
    .max(40),
  notes: z.string().trim().max(2000).nullable().optional(),
})

type Contexte = { params: Promise<{ id: string }> }

function lignesDe(facture: any): LigneFacture[] {
  return Array.isArray(facture?.lines) ? facture.lines : []
}

async function contexte(params: Contexte['params']) {
  const { user, role } = await requireUser()
  const { id } = await params
  if (!UUID.test(id)) throw new ApiError(400, 'Demande invalide')
  const admin = createAdminClient()
  const participants = await participantsDemande(admin, id)
  const estAdmin = role === 'ADMIN'
  const estClient = !!participants && participants.buyerId === user.id
  if (!participants || (!estAdmin && !estClient)) throw new ApiError(404, 'Demande introuvable')
  return { id, user, estAdmin, admin }
}

async function lireDossier(admin: any, id: string) {
  const [{ data: quote }, { data: po }, { data: facture }] = await Promise.all([
    admin.from('quotes').select('*').eq('request_id', id).eq('status', 'ACCEPTED').maybeSingle(),
    admin
      .from('purchase_orders')
      .select('id, po_number, status, deposit_percent, balance_percent, order_id, cgv_accepted_at, grand_total_usd, currency')
      .eq('request_id', id)
      .neq('status', 'CANCELLED')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from('invoices')
      .select('*')
      .eq('request_id', id)
      .eq('type', 'FINAL')
      .neq('status', 'CANCELLED')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  const orderId = facture?.order_id ?? po?.order_id ?? null
  const { data: order } = orderId
    ? await admin
        .from('orders')
        .select('id, reference, status, total_amount, deposit_amount, balance_amount, deposit_paid, balance_paid')
        .eq('id', orderId)
        .maybeSingle()
    : { data: null }
  return { quote, po, facture, order }
}

export async function GET(_request: NextRequest, { params }: Contexte) {
  try {
    const { id, estAdmin, admin } = await contexte(params)
    const { quote, po, facture, order } = await lireDossier(admin, id)

    const visible = facture && (estAdmin || facture.status !== 'DRAFT')
    const invoice = visible
      ? { ...facture, lines: lignesDe(facture), totaux: totauxFacture(lignesDe(facture), po?.deposit_percent ?? 60) }
      : null

    return NextResponse.json({
      vue: estAdmin ? 'ADMIN' : 'BUYER',
      quote: quote ? { id: quote.id, version: quote.version, grand_total_usd: quote.grand_total_usd, currency: quote.currency } : null,
      purchaseOrder: po ?? null,
      invoice,
      order: order ?? null,
      // Le client sait qu'une correction est en cours, sans voir le brouillon.
      enCorrection: !estAdmin && !!facture && facture.status === 'DRAFT' && !!facture.contest_reason,
      proposition: estAdmin && !facture && quote ? lignesDepuisProForma(quote) : null,
    })
  } catch (error) {
    return handleApiError(error, { route: '/api/requests/[id]/invoice', method: 'GET' })
  }
}

export async function PUT(request: NextRequest, { params }: Contexte) {
  try {
    const { id, user, estAdmin, admin } = await contexte(params)
    if (!estAdmin) throw new ApiError(403, "La facture finale est établie par l'administration Alpha Import")

    const rl = checkRateLimit(`invoice:${user.id}`, { maxRequests: 30, windowMs: 60000 })
    if (!rl.allowed) throw new ApiError(429, 'Trop de tentatives, patientez une minute')

    const parsed = schemaBrouillon.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Lignes de facture invalides', details: parsed.error.flatten() }, { status: 400 })
    }

    const { quote, po, facture } = await lireDossier(admin, id)
    if (!quote || !po) throw new ApiError(409, "La facture finale s'établit après acceptation de la pro forma par le client")
    if (facture && facture.status !== 'DRAFT') {
      throw new ApiError(409, 'Facture déjà émise : le client doit la contester pour qu\'elle redevienne modifiable')
    }

    // Les postes laissés à zéro ne figurent pas sur la facture.
    const lignes: LigneFacture[] = parsed.data.lines.filter((l) => l.montant > 0)
    const refus = motifRefusLignes(lignes)
    if (refus) throw new ApiError(400, refus)
    const t = totauxFacture(lignes, po.deposit_percent ?? 60)

    // Commande : créée en attente au premier enregistrement, jamais payable avant validation du client.
    let orderId: string | null = facture?.order_id ?? po.order_id ?? null
    if (orderId) {
      const { data: existante } = await admin.from('orders').select('id, status').eq('id', orderId).maybeSingle()
      if (existante && existante.status !== 'PENDING') throw new ApiError(409, 'La commande a déjà été validée par le client')
      await admin.from('orders').update({ total_amount: t.total, alpha_commission: t.commission }).eq('id', orderId).eq('status', 'PENDING')
    } else {
      const { data: creee, error: erreurCommande } = await admin
        .from('orders')
        .insert({
          reference: po.po_number,
          request_id: id,
          total_amount: t.total,
          alpha_commission: t.commission,
          partner_payout: Number(po.grand_total_usd ?? 0),
          status: 'PENDING',
          validated_by_admin: false,
        })
        .select('id')
        .single()
      if (erreurCommande) throw erreurCommande
      orderId = creee.id
      await admin.from('purchase_orders').update({ order_id: orderId }).eq('id', po.id)
    }

    const champs = {
      order_id: orderId,
      request_id: id,
      purchase_order_id: po.id,
      type: 'FINAL',
      number: numeroFacture(po.po_number),
      currency: po.currency ?? 'USD',
      lines: lignes,
      total_amount: t.total,
      deposit_amount: t.acompte,
      balance_amount: t.solde,
      alpha_commission: t.commission,
      notes: parsed.data.notes ?? null,
      status: 'DRAFT',
    }

    const { data: enregistree, error } = facture
      ? await admin.from('invoices').update(champs).eq('id', facture.id).eq('status', 'DRAFT').select().maybeSingle()
      : await admin.from('invoices').insert(champs).select().single()
    if (error) throw error
    if (!enregistree) throw new ApiError(409, "La facture vient d'être modifiée, rechargez la page")

    await logAudit({
      actorId: user.id,
      action: facture ? 'UPDATE_FINAL_INVOICE' : 'CREATE_FINAL_INVOICE',
      targetType: 'invoices',
      targetId: enregistree.id,
      details: { requestId: id, total: t.total, commission: t.commission, lignes: lignes.length },
    })

    return NextResponse.json({ invoice: { ...enregistree, lines: lignes, totaux: t } })
  } catch (error) {
    return handleApiError(error, { route: '/api/requests/[id]/invoice', method: 'PUT' })
  }
}
