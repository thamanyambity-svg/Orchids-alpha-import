import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole, requireUser, handleApiError } from '@/lib/auth-guard'
import { logAudit } from '@/lib/audit'

const MAX_FILES = 200

const createFileSchema = z.object({
  order_id: z.string().uuid(),
  request_id: z.string().uuid(),
  country_code: z.string().min(2).max(5).default('CD'),
  transport_mode: z.enum(['AIR', 'SEA', 'LAND']).optional(),
  transport_ref: z.string().max(100).optional(),
  vessel_flight_name: z.string().max(100).optional(),
  container_number: z.string().max(50).optional(),
  assigned_partner_id: z.string().uuid().optional(),
})

/**
 * Dossiers douaniers visibles par l'appelant.
 *
 * Le périmètre n'est pas filtré ici : les policies de `customs_files` le font
 * déjà — un administrateur voit tout, un partenaire ses dossiers assignés, un
 * acheteur ceux de ses commandes. Refaire le filtre côté route créerait une
 * deuxième vérité, qui finirait par diverger.
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireUser()

    const status = new URL(request.url).searchParams.get('status')

    let query = supabase
      .from('customs_files')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(MAX_FILES)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('[GET /api/customs/files]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const files = data ?? []
    const orderIds = [...new Set(files.map((f) => f.order_id).filter(Boolean))]

    const { data: orders } = orderIds.length
      ? await supabase.from('orders').select('id, reference').in('id', orderIds)
      : { data: [] as { id: string; reference: string }[] }

    const references = new Map((orders ?? []).map((o) => [o.id, o.reference]))

    return NextResponse.json({
      files: files.map((file) => ({ ...file, order_reference: references.get(file.order_id) ?? null })),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * Ouverture d'un dossier douanier pour une commande.
 *
 * Un dossier par commande : la contrainte n'existe pas en base, on la fait
 * respecter ici plutôt que de laisser deux dossiers concurrents décrire la même
 * marchandise.
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireRole(['ADMIN', 'PARTNER'])

    const parsed = createFileSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data: existing } = await supabase
      .from('customs_files')
      .select('id')
      .eq('order_id', parsed.data.order_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Un dossier douanier existe déjà pour cette commande', id: existing.id },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('customs_files')
      .insert({ ...parsed.data, status: 'DRAFT', created_by: user.id })
      .select('*')
      .single()

    if (error) {
      console.error('[POST /api/customs/files]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logAudit({
      action: 'CUSTOMS_FILE_CREATED',
      targetType: 'customs_file',
      targetId: data.id,
      actorId: user.id,
      details: { order_id: parsed.data.order_id, country_code: parsed.data.country_code },
    })

    return NextResponse.json({ file: data }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
