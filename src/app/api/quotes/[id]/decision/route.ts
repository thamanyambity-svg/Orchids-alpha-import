import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, handleApiError, ApiError } from '@/lib/auth-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendToN8N } from '@/lib/webhooks'
import { logAudit } from '@/lib/audit'
import { participantsDemande, estParticipant } from '@/lib/requests/participants'
import { REGLES, MOTIF_MIN, MOTIF_MAX, dateValidite, estExpiree, formatMontant, dateFr, type Decision } from '@/lib/quotes/workflow'
import { idsAdmins, notifier, messageDossier } from '@/lib/quotes/effets'

/**
 * Décision sur une pro forma.
 *
 * - `approve` (administration) : le brouillon du partenaire est transmis au
 *   client, avec sa date de validité ; la version précédente encore en
 *   attente de réponse est remplacée.
 * - `return` (administration, motif) : le brouillon repart au partenaire,
 *   sans que le client le voie.
 * - `accept` (client) : la base génère le bon de commande (déclencheur
 *   create_po_from_accepted_quote) et passe la demande en « devis accepté ».
 * - `revise` (client, motif) : le partenaire est invité à refaire une version.
 *
 * L'ancienne acceptation écrivait avec la session du client, qui n'a qu'un
 * droit de lecture sur les devis : elle ne pouvait pas aboutir. Toutes les
 * écritures passent ici par la clé de service, après les contrôles, et ne
 * s'appliquent que si le statut n'a pas changé entre-temps.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const schema = z.object({
  action: z.enum(['approve', 'return', 'accept', 'revise']),
  motif: z.string().trim().max(MOTIF_MAX).optional(),
})

type Contexte = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Contexte) {
  try {
    const { user, role } = await requireUser()
    const { id } = await params
    if (!UUID.test(id)) throw new ApiError(400, 'Pro forma invalide')

    const rl = checkRateLimit(`quote-decision:${user.id}`, { maxRequests: 20, windowMs: 60000 })
    if (!rl.allowed) throw new ApiError(429, 'Trop de tentatives, patientez une minute')

    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw new ApiError(400, 'Décision invalide')
    const action: Decision = parsed.data.action
    const regle = REGLES[action]
    const motif = parsed.data.motif ?? ''
    if (regle.motif && motif.length < MOTIF_MIN) throw new ApiError(400, 'Précisez le motif')

    const admin = createAdminClient()
    const { data: quote } = await admin
      .from('quotes')
      .select('id, request_id, status, version, validity_days, valid_until, grand_total_usd, currency, submitted_at')
      .eq('id', id)
      .maybeSingle()
    if (!quote) throw new ApiError(404, 'Pro forma introuvable')

    const participants = await participantsDemande(admin, quote.request_id)
    if (!participants) throw new ApiError(404, 'Pro forma introuvable')
    const estAdmin = role === 'ADMIN'
    if (!estAdmin && !estParticipant(participants, user.id)) throw new ApiError(404, 'Pro forma introuvable')
    // Un client ne voit pas un brouillon : il ne doit pas non plus pouvoir en deviner l'existence.
    if (!estAdmin && participants.buyerId === user.id && !quote.submitted_at) throw new ApiError(404, 'Pro forma introuvable')

    if (regle.role === 'ADMIN' && !estAdmin) throw new ApiError(403, "Décision réservée à l'administration Alpha Import")
    if (regle.role === 'BUYER' && participants.buyerId !== user.id) throw new ApiError(403, 'Décision réservée au client de la demande')

    if (!regle.depuis.includes(quote.status)) {
      throw new ApiError(409, "Cette pro forma n'attend plus cette décision")
    }

    const maintenant = new Date()
    const horodatage = maintenant.toISOString()

    if (action === 'accept' && estExpiree(quote, maintenant)) {
      await admin.from('quotes').update({ status: 'EXPIRED' }).eq('id', id).eq('status', 'SUBMITTED')
      throw new ApiError(409, 'Pro forma expirée : demandez une révision au partenaire')
    }

    const changements: Record<string, unknown> =
      action === 'approve'
        ? { status: 'SUBMITTED', submitted_at: horodatage, valid_until: dateValidite(maintenant, quote.validity_days ?? 30) }
        : action === 'accept'
          ? { status: 'ACCEPTED', accepted_at: horodatage }
          : { status: regle.vers, rejected_reason: motif }

    // Écriture conditionnelle au statut lu : deux décisions simultanées ne s'appliquent pas toutes les deux.
    const { data: maj, error } = await admin
      .from('quotes')
      .update(changements)
      .eq('id', id)
      .eq('status', quote.status)
      .select()
      .maybeSingle()
    if (error) throw error
    if (!maj) throw new ApiError(409, "Cette pro forma vient d'être modifiée, rechargez la page")

    const { data: demande } = await admin.from('import_requests').select('reference').eq('id', quote.request_id).maybeSingle()
    const ref = demande?.reference ?? ''
    const v = quote.version
    const total = formatMontant(maj.grand_total_usd ?? quote.grand_total_usd, quote.currency ?? 'USD')
    const partenaire = { id: participants.partnerUserId, espace: 'PARTNER' as const }
    const client = { id: participants.buyerId, espace: 'BUYER' as const }
    const admins = (await idsAdmins(admin)).map((a) => ({ id: a, espace: 'ADMIN' as const }))

    let purchaseOrder: { id: string; po_number: string } | null = null

    if (action === 'approve') {
      // La version précédente encore en attente de réponse est remplacée.
      await admin
        .from('quotes')
        .update({ status: 'REVISED', rejected_reason: `Remplacée par la version ${v}` })
        .eq('request_id', quote.request_id)
        .eq('status', 'SUBMITTED')
        .neq('id', id)
      await notifier(admin, quote.request_id, [client], {
        title: 'Votre pro forma est disponible',
        message: `Pro forma v${v} pour la demande ${ref} : ${total}, valable jusqu'au ${dateFr(maj.valid_until)}. Acceptez-la ou demandez une révision.`,
        type: 'success',
        onglet: 'quotes',
      })
      await notifier(admin, quote.request_id, [partenaire], {
        title: 'Pro forma validée',
        message: `Votre pro forma v${v} (${ref}) a été validée et transmise au client.`,
        type: 'success',
      })
      await messageDossier(
        admin,
        quote.request_id,
        user.id,
        `Pro forma v${v} validée par Alpha Import et transmise au client : ${total}, valable jusqu'au ${dateFr(maj.valid_until)}. Le client peut l'accepter ou demander une révision dans l'onglet « Devis / Proforma ».`
      )
    } else if (action === 'return') {
      // Échange interne : pas de message dans la discussion, que le client lit.
      await notifier(admin, quote.request_id, [partenaire], {
        title: 'Pro forma à reprendre',
        message: `Pro forma v${v} (${ref}) renvoyée par Alpha Import : ${motif}`,
        type: 'warning',
      })
    } else if (action === 'accept') {
      const { data: bc } = await admin
        .from('purchase_orders')
        .select('id, po_number')
        .eq('quote_id', id)
        .maybeSingle()
      purchaseOrder = bc ?? null
      await notifier(admin, quote.request_id, [partenaire, ...admins], {
        title: 'Pro forma acceptée',
        message: `Le client a accepté la pro forma v${v} (${ref}, ${total})${bc ? ` — bon de commande ${bc.po_number}` : ''}.`,
        type: 'success',
      }, user.id)
      await messageDossier(
        admin,
        quote.request_id,
        user.id,
        `Pro forma v${v} acceptée.${bc ? ` Bon de commande ${bc.po_number} généré : à signer dans l'onglet « Bons de commande ».` : ''}`
      )
    } else {
      await notifier(admin, quote.request_id, [partenaire, ...admins], {
        title: 'Révision demandée',
        message: `Le client demande une révision de la pro forma v${v} (${ref}) : ${motif}`,
        type: 'warning',
      }, user.id)
      await messageDossier(admin, quote.request_id, user.id, `Révision demandée sur la pro forma v${v} : ${motif}`)
    }

    await logAudit({
      actorId: user.id,
      action: `QUOTE_${action.toUpperCase()}`,
      targetType: 'quotes',
      targetId: id,
      details: { requestId: quote.request_id, version: v, from: quote.status, to: maj.status, motif: motif || undefined, purchaseOrder: purchaseOrder?.po_number },
    })
    await sendToN8N(`quote_${action}`, { quoteId: id, requestId: quote.request_id, version: v }).catch(() => undefined)

    return NextResponse.json({ quote: maj, purchase_order: purchaseOrder })
  } catch (error) {
    return handleApiError(error, { route: '/api/quotes/[id]/decision', method: 'POST' })
  }
}
