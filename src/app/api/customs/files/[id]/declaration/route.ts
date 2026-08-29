import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole, handleApiError } from '@/lib/auth-guard'
import { logAudit } from '@/lib/audit'

const declarationSchema = z.object({
  id: z.string().uuid().optional(),
  declaration_number: z.string().max(100).optional(),
  declared_value_usd: z.coerce.number().min(0),
  notes: z.string().max(2000).optional(),
})

/**
 * Création ou mise à jour de la déclaration d'un dossier.
 *
 * Une déclaration validée n'est plus modifiable : la validation fiscale ou
 * comptable porte sur des montants précis, les laisser bouger ensuite viderait
 * la validation de son sens.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user } = await requireRole(['ADMIN', 'PARTNER'])
    const { id: fileId } = await params

    const parsed = declarationSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const payload = {
      customs_file_id: fileId,
      declaration_number: parsed.data.declaration_number ?? null,
      declared_value_usd: parsed.data.declared_value_usd,
      notes: parsed.data.notes ?? null,
      updated_at: new Date().toISOString(),
    }

    if (parsed.data.id) {
      const { data: existing } = await supabase
        .from('customs_declarations')
        .select('id, is_fiscal_validated, is_accounting_validated')
        .eq('id', parsed.data.id)
        .eq('customs_file_id', fileId)
        .maybeSingle()

      if (!existing) {
        return NextResponse.json({ error: 'Déclaration introuvable' }, { status: 404 })
      }
      if (existing.is_fiscal_validated || existing.is_accounting_validated) {
        return NextResponse.json(
          { error: 'Cette déclaration est validée et ne peut plus être modifiée' },
          { status: 409 }
        )
      }

      const { data, error } = await supabase
        .from('customs_declarations')
        .update(payload)
        .eq('id', parsed.data.id)
        .select('*')
        .single()

      if (error) {
        console.error('[PUT /api/customs/files/:id/declaration]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      await logAudit({
        action: 'CUSTOMS_DECLARATION_UPDATED',
        targetType: 'customs_declaration',
        targetId: data.id,
        actorId: user.id,
        details: { customs_file_id: fileId },
      })

      return NextResponse.json({ declaration: data })
    }

    const { data, error } = await supabase
      .from('customs_declarations')
      .insert({ ...payload, total_taxes_usd: 0 })
      .select('*')
      .single()

    if (error) {
      console.error('[PUT /api/customs/files/:id/declaration]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logAudit({
      action: 'CUSTOMS_DECLARATION_CREATED',
      targetType: 'customs_declaration',
      targetId: data.id,
      actorId: user.id,
      details: { customs_file_id: fileId },
    })

    return NextResponse.json({ declaration: data }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
