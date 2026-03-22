'use server'

import { createClient } from '@supabase/supabase-js'
import {
  requireCustomsRole,
  verifyCustomsFileAccess,
} from '@/lib/server-actions/customs-guard'
import { ok, fail } from '@/lib/server-actions/result'
import type { ServerActionResult } from '@/lib/server-actions/result'

function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Configuration serveur Supabase incomplète.')
  }
  return createClient(url, key)
}

export async function validateFiscal(
  declarationId: string
): Promise<ServerActionResult<void>> {
  try {
    const user = await requireCustomsRole()

    if (!['ADMIN', 'FISCAL_CONSULTANT'].includes(user.role)) {
      return fail(
        'Seul un consultant fiscal ou un administrateur peut valider fiscalement.'
      )
    }

    const admin = createSupabaseAdminClient()

    const { data: declaration, error: declError } = await admin
      .from('customs_declarations')
      .select('id, is_fiscal_validated, customs_file_id')
      .eq('id', declarationId)
      .single()

    if (declError || !declaration) return fail('Déclaration introuvable.')

    await verifyCustomsFileAccess(declaration.customs_file_id, user)

    if (declaration.is_fiscal_validated) {
      return fail('Cette déclaration a déjà été validée fiscalement.')
    }

    const { count, error: countError } = await admin
      .from('customs_tax_lines')
      .select('id', { count: 'exact', head: true })
      .eq('declaration_id', declarationId)

    if (countError) {
      return fail('Impossible de vérifier les lignes fiscales.')
    }

    if (!count || count === 0) {
      return fail(
        'Impossible de valider : aucune ligne fiscale n’a été saisie.'
      )
    }

    const { error } = await admin
      .from('customs_declarations')
      .update({
        is_fiscal_validated: true,
        fiscal_validated_by: user.id,
        fiscal_validated_at: new Date().toISOString(),
      })
      .eq('id', declarationId)

    if (error) {
      console.error('[validateFiscal]', error)
      return fail('Échec de l’enregistrement de la validation fiscale.')
    }

    return ok(undefined)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.'
    return fail(message)
  }
}

export async function validateAccounting(
  declarationId: string
): Promise<ServerActionResult<void>> {
  try {
    const user = await requireCustomsRole()

    if (!['ADMIN', 'ACCOUNTANT'].includes(user.role)) {
      return fail(
        'Seul un comptable ou un administrateur peut valider comptablement.'
      )
    }

    const admin = createSupabaseAdminClient()

    const { data: declaration, error: declError } = await admin
      .from('customs_declarations')
      .select(
        'id, is_fiscal_validated, is_accounting_validated, customs_file_id'
      )
      .eq('id', declarationId)
      .single()

    if (declError || !declaration) return fail('Déclaration introuvable.')

    await verifyCustomsFileAccess(declaration.customs_file_id, user)

    if (!declaration.is_fiscal_validated) {
      return fail(
        'La validation fiscale doit précéder la validation comptable.'
      )
    }

    if (declaration.is_accounting_validated) {
      return fail('Cette déclaration a déjà été validée comptablement.')
    }

    const { error } = await admin
      .from('customs_declarations')
      .update({
        is_accounting_validated: true,
        accounting_validated_by: user.id,
        accounting_validated_at: new Date().toISOString(),
      })
      .eq('id', declarationId)

    if (error) {
      console.error('[validateAccounting]', error)
      return fail('Échec de l’enregistrement de la validation comptable.')
    }

    return ok(undefined)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.'
    return fail(message)
  }
}
