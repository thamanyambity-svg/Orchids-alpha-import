import { NextRequest, NextResponse } from 'next/server'
import { requireRole, handleApiError } from '@/lib/auth-guard'

const PAGE_SIZE = 25
const MAX_PAGE_SIZE = 100
const DOCUMENT_TYPES = ['REQUEST_DOCUMENT', 'PAYMENT_PROOF'] as const
const ACTIONS = ['VIEW', 'DOWNLOAD', 'SIGNED_URL_GENERATED'] as const

/**
 * Journal des consultations de pièces sensibles.
 *
 * `document_access_logs` n'a ni policy UPDATE ni policy DELETE : ce qui y entre
 * ne peut plus être modifié, y compris par un administrateur. Cette route ne fait
 * donc que lire, et pagine côté base — le journal grossit à chaque ouverture de
 * document et ne doit jamais être chargé en entier.
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireRole(['ADMIN'])

    const searchParams = new URL(request.url).searchParams
    const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number.parseInt(searchParams.get('page_size') ?? String(PAGE_SIZE), 10) || PAGE_SIZE)
    )
    const documentType = searchParams.get('document_type')
    const action = searchParams.get('action')

    let query = supabase
      .from('document_access_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Les filtres viennent de l'URL : on n'accepte que les valeurs de l'énumération,
    // sinon PostgREST renvoie une erreur de type sur un simple paramètre bidon.
    if (documentType && (DOCUMENT_TYPES as readonly string[]).includes(documentType)) {
      query = query.eq('document_type', documentType)
    }
    if (action && (ACTIONS as readonly string[]).includes(action)) {
      query = query.eq('action', action)
    }

    const from = (page - 1) * pageSize
    const { data, error, count } = await query.range(from, from + pageSize - 1)

    if (error) {
      console.error('[GET /api/admin/document-access-logs]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = data ?? []

    // Résolution des identités en une requête groupée : la jointure imbriquée
    // dépendrait du nom des contraintes, qui a déjà changé sur ce schéma.
    const actorIds = [
      ...new Set(
        rows
          .flatMap((row) => [row.accessed_by as string | null, row.admin_id as string | null])
          .filter((id): id is string => Boolean(id))
      ),
    ]

    const { data: profiles } = actorIds.length
      ? await supabase.from('profiles').select('id, email, full_name').in('id', actorIds)
      : { data: [] as { id: string; email: string; full_name: string }[] }

    const people = new Map((profiles ?? []).map((p) => [p.id, p]))

    return NextResponse.json({
      logs: rows.map((row) => {
        const actor = people.get(row.accessed_by) ?? (row.admin_id ? people.get(row.admin_id) : undefined)
        return {
          ...row,
          actor_email: actor?.email ?? null,
          actor_full_name: actor?.full_name ?? null,
        }
      }),
      total: count ?? 0,
      page,
      page_size: pageSize,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
