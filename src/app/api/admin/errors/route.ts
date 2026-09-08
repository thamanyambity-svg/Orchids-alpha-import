import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole, handleApiError, ApiError } from '@/lib/auth-guard'
import { logAudit } from '@/lib/audit'

/**
 * Consultation et acquittement des incidents.
 *
 * Une supervision qu'on ne peut pas lire ne supervise rien : c'est cette route
 * qui rend la table exploitable.
 *
 * L'accès est réservé aux administrateurs. Les politiques RLS de
 * `error_events` l'imposent déjà, mais le garde est explicite ici pour que le
 * refus soit un 403 franc plutôt qu'une liste vide — un résultat vide se
 * confond avec « aucun incident », ce qui est exactement le message à ne pas
 * donner quand la plateforme tombe.
 */

const MAX_INCIDENTS = 100

const filtreSchema = z.object({
  statut: z.enum(['ouverts', 'resolus', 'tous']).default('ouverts'),
  source: z.enum(['server', 'api', 'client', 'edge', 'job']).optional(),
  limite: z.coerce.number().int().min(1).max(MAX_INCIDENTS).default(50),
})

const acquittementSchema = z.object({
  id: z.string().uuid(),
  resolu: z.boolean(),
})

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireRole(['ADMIN'])

    const params = Object.fromEntries(new URL(request.url).searchParams)
    const parsed = filtreSchema.safeParse(params)
    if (!parsed.success) {
      throw new ApiError(400, 'Filtres invalides')
    }
    const { statut, source, limite } = parsed.data

    let requete = supabase
      .from('error_events')
      .select(
        'id, fingerprint, level, source, name, message, route, method, status, digest, release_sha, environment, occurrences, first_seen_at, last_seen_at, resolved_at'
      )
      // Les plus récents d'abord : un incident actif prime sur un incident
      // fréquent mais éteint.
      .order('last_seen_at', { ascending: false })
      .limit(limite)

    if (statut === 'ouverts') requete = requete.is('resolved_at', null)
    if (statut === 'resolus') requete = requete.not('resolved_at', 'is', null)
    if (source) requete = requete.eq('source', source)

    const { data, error } = await requete
    if (error) throw new ApiError(500, error.message)

    const incidents = data ?? []

    return NextResponse.json({
      incidents,
      // Compteurs de tête : ce qu'on veut savoir avant même de lire la liste.
      total: incidents.length,
      occurrences: incidents.reduce((n, i) => n + (i.occurrences ?? 0), 0),
    })
  } catch (error) {
    return handleApiError(error, { route: '/api/admin/errors', method: 'GET' })
  }
}

/**
 * Acquitte un incident, ou le rouvre.
 *
 * L'acquittement n'efface rien : la ligne reste, avec son historique et son
 * compteur. Et la fonction d'enregistrement rouvre automatiquement un incident
 * acquitté qui se reproduit — le traiter comme réglé alors qu'il revient
 * reviendrait à le cacher.
 */
export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user } = await requireRole(['ADMIN'])

    const parsed = acquittementSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      throw new ApiError(400, 'Requête invalide')
    }
    const { id, resolu } = parsed.data

    const { data, error } = await supabase
      .from('error_events')
      .update({
        resolved_at: resolu ? new Date().toISOString() : null,
        resolved_by: resolu ? user.id : null,
      })
      .eq('id', id)
      .select('id, fingerprint, resolved_at')
      .maybeSingle()

    if (error) throw new ApiError(500, error.message)
    if (!data) throw new ApiError(404, 'Incident introuvable')

    await logAudit({
      action: resolu ? 'ERROR_EVENT_RESOLVED' : 'ERROR_EVENT_REOPENED',
      targetType: 'error_event',
      targetId: id,
      actorId: user.id,
      details: { fingerprint: data.fingerprint },
    })

    return NextResponse.json({ success: true, incident: data })
  } catch (error) {
    return handleApiError(error, { route: '/api/admin/errors', method: 'PATCH' })
  }
}
