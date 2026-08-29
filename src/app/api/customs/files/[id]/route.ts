import { NextResponse } from 'next/server'
import { requireUser, handleApiError } from '@/lib/auth-guard'

/**
 * Dossier douanier complet : en-tête, déclarations et leurs lignes de taxes,
 * historique des statuts.
 *
 * L'accès reste porté par les policies. Un dossier hors périmètre ne renvoie
 * aucune ligne, ce qui se traduit ici par un 404 — on ne distingue pas
 * « n'existe pas » de « pas pour vous », qui renseignerait sur l'existence de
 * dossiers d'autres partenaires.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireUser()
    const { id } = await params

    const { data: file, error } = await supabase
      .from('customs_files')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('[GET /api/customs/files/:id]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!file) {
      return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
    }

    const [{ data: declarations }, { data: history }, { data: order }] = await Promise.all([
      supabase
        .from('customs_declarations')
        .select('*')
        .eq('customs_file_id', id)
        .order('created_at', { ascending: true }),
      supabase
        .from('customs_status_history')
        .select('*')
        .eq('customs_file_id', id)
        .order('changed_at', { ascending: false }),
      supabase.from('orders').select('id, reference, total_amount, status').eq('id', file.order_id).maybeSingle(),
    ])

    const declarationIds = (declarations ?? []).map((d) => d.id)

    const { data: taxLines } = declarationIds.length
      ? await supabase
          .from('customs_tax_lines')
          .select('*, customs_tax_types(id, code, label)')
          .in('declaration_id', declarationIds)
      : { data: [] as Record<string, unknown>[] }

    return NextResponse.json({
      file,
      order: order ?? null,
      declarations: (declarations ?? []).map((declaration) => ({
        ...declaration,
        tax_lines: (taxLines ?? []).filter((line) => line.declaration_id === declaration.id),
      })),
      history: history ?? [],
    })
  } catch (error) {
    return handleApiError(error)
  }
}
