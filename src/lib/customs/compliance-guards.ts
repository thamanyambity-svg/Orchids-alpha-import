import type { SupabaseClient } from '@supabase/supabase-js'
import type { CustomsFileStatus } from '@/lib/customs/types'

/**
 * Prérequis réglementaires d'une transition douanière.
 *
 * La matrice de transitions dit qui a le droit de faire avancer un dossier ;
 * ces gardes disent si le dossier lui-même est en état de l'être. Les deux sont
 * distincts : un administrateur a le droit de libérer un dossier, mais pas tant
 * que le comptable n'a pas validé les déclarations.
 */

export interface GuardResult {
  allowed: boolean
  reason?: string
}

/**
 * Toutes les déclarations doivent être validées fiscalement avant le paiement
 * des droits (LIQUIDATED → PAID).
 */
export async function guardFiscalValidated(
  supabase: SupabaseClient,
  customsFileId: string
): Promise<GuardResult> {
  const { data: declarations, error } = await supabase
    .from('customs_declarations')
    .select('id, is_fiscal_validated')
    .eq('customs_file_id', customsFileId)

  if (error) {
    return { allowed: false, reason: 'Erreur lors de la vérification des validations fiscales.' }
  }

  if (!declarations?.length) {
    return {
      allowed: false,
      reason:
        'Conformité fiscale : aucune déclaration enregistrée. Une déclaration validée est requise avant le paiement des droits.',
    }
  }

  const pending = declarations.filter((d) => !d.is_fiscal_validated).length
  if (pending > 0) {
    return {
      allowed: false,
      reason: `Conformité fiscale : ${pending} déclaration(s) en attente de validation fiscale.`,
    }
  }

  return { allowed: true }
}

/**
 * Toutes les déclarations doivent être validées comptablement avant la
 * libération du dossier (PAID → RELEASED).
 */
export async function guardAccountingValidated(
  supabase: SupabaseClient,
  customsFileId: string
): Promise<GuardResult> {
  const { data: declarations, error } = await supabase
    .from('customs_declarations')
    .select('id, is_accounting_validated')
    .eq('customs_file_id', customsFileId)

  if (error) {
    return { allowed: false, reason: 'Erreur lors de la vérification des validations comptables.' }
  }

  if (!declarations?.length) {
    return {
      allowed: false,
      reason:
        'Conformité comptable : aucune déclaration enregistrée. Une déclaration validée est requise avant la libération du dossier.',
    }
  }

  const pending = declarations.filter((d) => !d.is_accounting_validated).length
  if (pending > 0) {
    return {
      allowed: false,
      reason: `Conformité comptable : ${pending} déclaration(s) en attente de validation comptable.`,
    }
  }

  return { allowed: true }
}

/**
 * Gardes actives :
 *   LIQUIDATED → PAID      validation fiscale complète
 *   PAID       → RELEASED  validation comptable complète
 */
export async function checkCustomsTransitionGuards(
  supabase: SupabaseClient,
  customsFileId: string,
  currentStatus: CustomsFileStatus,
  newStatus: CustomsFileStatus
): Promise<GuardResult> {
  if (currentStatus === 'LIQUIDATED' && newStatus === 'PAID') {
    return guardFiscalValidated(supabase, customsFileId)
  }

  if (currentStatus === 'PAID' && newStatus === 'RELEASED') {
    return guardAccountingValidated(supabase, customsFileId)
  }

  return { allowed: true }
}
