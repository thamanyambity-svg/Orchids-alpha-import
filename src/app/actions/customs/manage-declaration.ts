'use server'

import { createClient } from '@supabase/supabase-js'
import {
  requireCustomsRole,
  verifyCustomsFileAccess,
  type CustomsAuthUser,
} from '@/lib/server-actions/customs-guard'
import { ok, fail } from '@/lib/server-actions/result'
import type { ServerActionResult } from '@/lib/server-actions/result'

const MANAGE_DECLARATION_ROLES = [
  'ADMIN',
  'FISCAL_CONSULTANT',
  'PARTNER',
  'PARTNER_COUNTRY',
] as const

export interface TaxType {
  id: string
  code: string
  label: string
  description: string | null
  default_rate_percent: number | null
}

export interface UpsertDeclarationInput {
  customs_file_id: string
  declared_value_usd: number
  declaration_number?: string
  notes?: string
}

export interface AddTaxLineInput {
  declaration_id: string
  tax_type_id: string
  base_amount_usd: number
  rate_percent?: number
  final_amount_usd?: number
  notes?: string
}

export interface UpdateTaxLineInput {
  tax_line_id: string
  base_amount_usd?: number
  rate_percent?: number | null
  final_amount_usd?: number
  notes?: string | null
}

function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Configuration serveur Supabase incomplète.')
  }
  return createClient(url, key)
}

function assertManageRole(user: CustomsAuthUser): ServerActionResult<never> | null {
  if (
    !MANAGE_DECLARATION_ROLES.includes(
      user.role as (typeof MANAGE_DECLARATION_ROLES)[number]
    )
  ) {
    return fail(
      'Accès refusé : seuls Admin, Consultant fiscal et Partenaire pays peuvent gérer les déclarations.'
    )
  }
  return null
}

async function recalcTotalTaxes(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  declarationId: string
): Promise<void> {
  const { data: lines } = await admin
    .from('customs_tax_lines')
    .select('final_amount_usd')
    .eq('declaration_id', declarationId)

  const total = (lines ?? []).reduce(
    (sum, l: { final_amount_usd: number }) =>
      sum + (Number(l.final_amount_usd) || 0),
    0
  )

  await admin
    .from('customs_declarations')
    .update({
      total_taxes_usd: Math.round(total * 100) / 100,
    })
    .eq('id', declarationId)
}

function computeFinalAmount(
  baseAmount: number,
  ratePercent: number | null | undefined,
  override: number | undefined
): number {
  if (override !== undefined && !Number.isNaN(override)) return override
  if (ratePercent != null) {
    return Math.round(((baseAmount * ratePercent) / 100) * 100) / 100
  }
  return Math.round(baseAmount * 100) / 100
}

export async function upsertDeclaration(
  input: UpsertDeclarationInput
): Promise<ServerActionResult<{ declarationId: string }>> {
  try {
    const user = await requireCustomsRole()
    const denied = assertManageRole(user)
    if (denied) return denied

    if (input.declared_value_usd < 0) {
      return fail('La valeur déclarée ne peut pas être négative.')
    }

    await verifyCustomsFileAccess(input.customs_file_id, user)

    const admin = createSupabaseAdminClient()

    const { data: file, error: fileError } = await admin
      .from('customs_files')
      .select('id, status')
      .eq('id', input.customs_file_id)
      .single()

    if (fileError || !file) return fail('Dossier douanier introuvable.')
    if (file.status === 'RELEASED') {
      return fail('Impossible de modifier un dossier libéré.')
    }

    const { data: existing } = await admin
      .from('customs_declarations')
      .select('id, is_fiscal_validated')
      .eq('customs_file_id', input.customs_file_id)
      .maybeSingle()

    if (existing?.is_fiscal_validated) {
      return fail(
        'La déclaration est verrouillée — validation fiscale effectuée.'
      )
    }

    const payload = {
      customs_file_id: input.customs_file_id,
      declared_value_usd: input.declared_value_usd,
      declaration_number: input.declaration_number ?? null,
      notes: input.notes ?? null,
    }

    if (existing) {
      const { error } = await admin
        .from('customs_declarations')
        .update(payload)
        .eq('id', existing.id)

      if (error) {
        console.error('[upsertDeclaration]', error)
        return fail('Échec de la mise à jour de la déclaration.')
      }
      return ok({ declarationId: existing.id })
    }

    const { data: created, error: createError } = await admin
      .from('customs_declarations')
      .insert({ ...payload, total_taxes_usd: 0 })
      .select('id')
      .single()

    if (createError || !created) {
      console.error('[upsertDeclaration] insert', createError)
      return fail('Échec de la création de la déclaration.')
    }

    return ok({ declarationId: created.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.'
    return fail(message)
  }
}

export async function addTaxLine(
  input: AddTaxLineInput
): Promise<ServerActionResult<{ taxLineId: string }>> {
  try {
    const user = await requireCustomsRole()
    const denied = assertManageRole(user)
    if (denied) return denied

    if (input.base_amount_usd < 0) {
      return fail('Le montant de base ne peut pas être négatif.')
    }

    const admin = createSupabaseAdminClient()

    const { data: declaration, error: declError } = await admin
      .from('customs_declarations')
      .select('id, is_fiscal_validated, customs_file_id')
      .eq('id', input.declaration_id)
      .single()

    if (declError || !declaration) return fail('Déclaration introuvable.')
    if (declaration.is_fiscal_validated) {
      return fail("Impossible d'ajouter une ligne après validation fiscale.")
    }

    await verifyCustomsFileAccess(declaration.customs_file_id, user)

    const { data: taxType, error: typeError } = await admin
      .from('customs_tax_types')
      .select('id')
      .eq('id', input.tax_type_id)
      .single()

    if (typeError || !taxType) return fail('Type de taxe invalide.')

    const finalAmount = computeFinalAmount(
      input.base_amount_usd,
      input.rate_percent,
      input.final_amount_usd
    )
    const computedAmount =
      input.rate_percent != null
        ? Math.round(
            ((input.base_amount_usd * input.rate_percent) / 100) * 100
          ) / 100
        : input.base_amount_usd

    const { data: line, error } = await admin
      .from('customs_tax_lines')
      .insert({
        declaration_id: input.declaration_id,
        tax_type_id: input.tax_type_id,
        base_amount_usd: input.base_amount_usd,
        rate_percent: input.rate_percent ?? null,
        computed_amount_usd: computedAmount,
        final_amount_usd: finalAmount,
        notes: input.notes ?? null,
        set_by: user.id,
      })
      .select('id')
      .single()

    if (error || !line) {
      console.error('[addTaxLine]', error)
      return fail("Échec de l'ajout de la ligne fiscale.")
    }

    await recalcTotalTaxes(admin, input.declaration_id)

    return ok({ taxLineId: line.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.'
    return fail(message)
  }
}

export async function updateTaxLine(
  input: UpdateTaxLineInput
): Promise<ServerActionResult<void>> {
  try {
    const user = await requireCustomsRole()
    const denied = assertManageRole(user)
    if (denied) return denied

    const admin = createSupabaseAdminClient()

    const { data: line, error: lineError } = await admin
      .from('customs_tax_lines')
      .select(
        `
        id,
        declaration_id,
        base_amount_usd,
        rate_percent,
        final_amount_usd,
        customs_declarations!inner (
          is_fiscal_validated,
          customs_file_id
        )
      `
      )
      .eq('id', input.tax_line_id)
      .single()

    if (lineError || !line) return fail('Ligne fiscale introuvable.')

    const decl = line.customs_declarations as unknown as {
      is_fiscal_validated: boolean
      customs_file_id: string
    }

    if (decl.is_fiscal_validated) {
      return fail('Impossible de modifier une ligne après validation fiscale.')
    }

    await verifyCustomsFileAccess(decl.customs_file_id, user)

    const newBase = input.base_amount_usd ?? Number(line.base_amount_usd)
    const newRate =
      input.rate_percent !== undefined ? input.rate_percent : line.rate_percent
    const newFinal = computeFinalAmount(
      newBase,
      newRate as number | null,
      input.final_amount_usd
    )
    const computedAmount =
      newRate != null
        ? Math.round(((newBase * Number(newRate)) / 100) * 100) / 100
        : newBase

    const updatePayload: Record<string, unknown> = {
      base_amount_usd: newBase,
      rate_percent: newRate,
      computed_amount_usd: computedAmount,
      final_amount_usd: newFinal,
    }
    if (input.notes !== undefined) updatePayload.notes = input.notes

    const { error } = await admin
      .from('customs_tax_lines')
      .update(updatePayload)
      .eq('id', input.tax_line_id)

    if (error) {
      console.error('[updateTaxLine]', error)
      return fail('Échec de la mise à jour de la ligne fiscale.')
    }

    await recalcTotalTaxes(admin, line.declaration_id as string)

    return ok(undefined)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.'
    return fail(message)
  }
}

export async function deleteTaxLine(
  taxLineId: string
): Promise<ServerActionResult<void>> {
  try {
    const user = await requireCustomsRole()
    const denied = assertManageRole(user)
    if (denied) return denied

    const admin = createSupabaseAdminClient()

    const { data: line, error: lineError } = await admin
      .from('customs_tax_lines')
      .select(
        `
        id,
        declaration_id,
        customs_declarations!inner (
          is_fiscal_validated,
          customs_file_id
        )
      `
      )
      .eq('id', taxLineId)
      .single()

    if (lineError || !line) return fail('Ligne fiscale introuvable.')

    const decl = line.customs_declarations as unknown as {
      is_fiscal_validated: boolean
      customs_file_id: string
    }

    if (decl.is_fiscal_validated) {
      return fail('Impossible de supprimer une ligne après validation fiscale.')
    }

    await verifyCustomsFileAccess(decl.customs_file_id, user)

    const declarationId = line.declaration_id as string

    const { error } = await admin.from('customs_tax_lines').delete().eq('id', taxLineId)

    if (error) {
      console.error('[deleteTaxLine]', error)
      return fail('Échec de la suppression.')
    }

    await recalcTotalTaxes(admin, declarationId)

    return ok(undefined)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.'
    return fail(message)
  }
}

export async function getTaxTypes(): Promise<ServerActionResult<TaxType[]>> {
  try {
    const user = await requireCustomsRole()
    const denied = assertManageRole(user)
    if (denied) return denied

    const admin = createSupabaseAdminClient()

    const { data, error } = await admin
      .from('customs_tax_types')
      .select('id, code, label, description, default_rate_percent')
      .eq('is_active', true)
      .order('code')

    if (error) {
      console.error('[getTaxTypes]', error)
      return fail('Impossible de charger les types de taxes.')
    }

    return ok((data ?? []) as TaxType[])
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.'
    return fail(message)
  }
}
