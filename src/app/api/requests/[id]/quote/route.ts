import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, handleApiError, ApiError } from '@/lib/auth-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendToN8N } from '@/lib/webhooks'
import { logAudit } from '@/lib/audit'
import { participantsDemande, estParticipant } from '@/lib/requests/participants'
import { totaux, visiblePourAcheteur, estExpiree } from '@/lib/quotes/workflow'
import { idsAdmins, notifier, messageDossier } from '@/lib/quotes/effets'

/**
 * Pro formas d'une demande.
 *
 * POST — le partenaire affecté (ou l'administration) prépare une pro forma.
 * Elle naît en brouillon (DRAFT), invisible du client, et attend la
 * validation d'Alpha Import (/api/quotes/[id]/decision).
 *
 * Auparavant la route écrivait les totaux, que la base calcule elle-même
 * (colonnes générées) : Postgres refusait l'insertion et aucune pro forma ne
 * pouvait être créée. Et un devis partait directement au client, sans
 * contrôle.
 *
 * GET — la liste, filtrée selon qui la demande : le client ne voit que les
 * pro formas transmises.
 *
 * Lectures et écritures par la clé de service, après vérification de la
 * participation au dossier.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const montant = z.number().min(0).max(1e9)
const texte = (max: number) => z.string().trim().max(max).nullable().optional()

const schemaProForma = z.object({
  unit_price_usd: z.number().positive().max(1e9),
  quantity: z.number().int().positive().max(1e6),
  currency: z.string().length(3).default('USD'),
  freight_cost_usd: montant.default(0),
  insurance_cost_usd: montant.default(0),
  customs_duty_estimate_usd: montant.default(0),
  inspection_cost_usd: montant.default(0),
  handling_fees_usd: montant.default(0),
  other_fees_usd: montant.default(0),
  incoterm: z.enum(['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP']).default('FOB'),
  port_loading: texte(120),
  port_discharge: texte(120),
  estimated_transit_days: z.number().int().positive().max(365).nullable().optional(),
  estimated_departure_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  estimated_arrival_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  payment_terms: z.string().trim().min(1).max(500).default("60 % d'acompte à la commande, 40 % contre documents d'expédition"),
  validity_days: z.number().int().min(1).max(90).default(30),
  specifications_json: z.record(z.string(), z.unknown()).nullable().optional(),
  notes: texte(2000),
})

type Contexte = { params: Promise<{ id: string }> }

async function contexte(params: Contexte['params']) {
  const { user, role } = await requireUser()
  const { id } = await params
  if (!UUID.test(id)) throw new ApiError(400, 'Demande invalide')
  const admin = createAdminClient()
  const participants = await participantsDemande(admin, id)
  // 404 et non 403 : ne pas confirmer l'existence d'un dossier étranger.
  if (!participants || (role !== 'ADMIN' && !estParticipant(participants, user.id))) {
    throw new ApiError(404, 'Demande introuvable')
  }
  return { id, user, role, admin, participants }
}

export async function POST(request: NextRequest, { params }: Contexte) {
  try {
    const { id, user, role, admin, participants } = await contexte(params)

    const estPartenaireAffecte = participants.partnerUserId === user.id
    if (role !== 'ADMIN' && !estPartenaireAffecte) {
      // Le client consulte et décide, il ne chiffre pas.
      throw new ApiError(403, 'Seul le partenaire affecté ou Alpha Import prépare une pro forma')
    }
    if (!participants.partnerProfileId) {
      throw new ApiError(400, "Aucun partenaire n'est assigné à cette demande")
    }

    const rl = checkRateLimit(`quote:${user.id}`, { maxRequests: 20, windowMs: 60000 })
    if (!rl.allowed) throw new ApiError(429, 'Trop de tentatives, patientez une minute')

    const parsed = schemaProForma.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Pro forma incomplète ou invalide', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: existantes, error: erreurLecture } = await admin
      .from('quotes')
      .select('id, version, status')
      .eq('request_id', id)
    if (erreurLecture) throw erreurLecture

    const liste = existantes ?? []
    if (liste.some((q: any) => q.status === 'ACCEPTED')) {
      throw new ApiError(409, 'Une pro forma a déjà été acceptée pour cette demande')
    }
    if (liste.some((q: any) => q.status === 'DRAFT')) {
      throw new ApiError(409, "Une pro forma attend déjà la validation d'Alpha Import")
    }
    const version = liste.reduce((max: number, q: any) => Math.max(max, Number(q.version) || 0), 0) + 1

    // Les totaux ne sont PAS envoyés : la base les calcule.
    const { data: creee, error } = await admin
      .from('quotes')
      .insert({
        ...parsed.data,
        request_id: id,
        partner_id: participants.partnerProfileId,
        version,
        status: 'DRAFT',
        submitted_at: null,
        valid_until: null,
      })
      .select()
      .single()
    if (error) throw error

    let quote = creee
    // Base sans colonnes générées : on pose les totaux nous-mêmes.
    if (quote && quote.grand_total_usd == null) {
      const { data: complete } = await admin.from('quotes').update(totaux(quote)).eq('id', quote.id).select().maybeSingle()
      if (complete) quote = complete
    }

    const { data: demande } = await admin.from('import_requests').select('status, reference').eq('id', id).maybeSingle()
    if (demande && ['PENDING', 'VALIDATED'].includes(demande.status)) {
      await admin.from('import_requests').update({ status: 'ANALYSIS', updated_at: new Date().toISOString() }).eq('id', id)
    }

    await logAudit({
      actorId: user.id,
      action: 'CREATE_QUOTE',
      targetType: 'quotes',
      targetId: quote.id,
      details: { requestId: id, version, status: 'DRAFT', grandTotal: quote.grand_total_usd },
    })

    const admins = await idsAdmins(admin)
    await notifier(
      admin,
      id,
      admins.map((a) => ({ id: a, espace: 'ADMIN' as const })),
      {
        title: 'Pro forma à valider',
        message: `Pro forma v${version} de la demande ${demande?.reference ?? ''} préparée par le partenaire : à contrôler avant transmission au client.`,
        type: 'warning',
      },
      user.id
    )
    await messageDossier(
      admin,
      id,
      user.id,
      `Pro forma v${version} préparée — en cours de vérification par Alpha Import avant transmission au client.`
    )

    await sendToN8N('quote_drafted', { quoteId: quote.id, requestId: id, version }).catch(() => undefined)

    return NextResponse.json({ quote }, { status: 201 })
  } catch (error) {
    return handleApiError(error, { route: '/api/requests/[id]/quote', method: 'POST' })
  }
}

export async function GET(_request: NextRequest, { params }: Contexte) {
  try {
    const { id, user, role, admin, participants } = await contexte(params)

    const { data, error } = await admin
      .from('quotes')
      .select('*')
      .eq('request_id', id)
      .order('version', { ascending: false })
    if (error) throw error

    const vue: 'ADMIN' | 'PARTNER' | 'BUYER' =
      role === 'ADMIN' ? 'ADMIN' : participants.partnerUserId === user.id ? 'PARTNER' : 'BUYER'

    const quotes = (data ?? [])
      .filter((q: any) => vue !== 'BUYER' || visiblePourAcheteur(q))
      .map((q: any) => ({ ...q, expiree: q.status === 'SUBMITTED' && estExpiree(q) }))

    return NextResponse.json({ vue, quotes })
  } catch (error) {
    return handleApiError(error, { route: '/api/requests/[id]/quote', method: 'GET' })
  }
}
