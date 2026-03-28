/**
 * compliance-guards.ts — Gardes transversaux : sécurité, conformité et douane.
 *
 * Vérifie les prérequis inter-domaines APRÈS la vérification de rôle, AVANT
 * l'exécution d'une transition d'état administrative :
 *
 *   Sécurité   — KYC acheteur VERIFIED avant tout engagement financier
 *   Conformité — Contrat partenaire ACTIVE avant sourcing
 *   Douane     — Dossier RELEASED avant livraison
 *   Fiscal     — Déclarations validées fiscalement avant paiement des droits
 *   Comptable  — Déclarations validées comptablement avant libération dossier
 *
 * Pas de directive "use server" — importé par des actions et routes serveur.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { CustomsFileStatus } from '@/lib/customs/types'
import type { OrderStatus } from '@/lib/types'

export interface GuardResult {
  allowed: boolean
  reason?: string
}

// ─── Sécurité : KYC acheteur ──────────────────────────────────────────────────

/**
 * L'acheteur doit avoir un KYC VERIFIED avant tout engagement financier
 * (transition order → AWAITING_DEPOSIT).
 */
export async function guardBuyerKycVerified(
  supabase: SupabaseClient,
  orderId: string
): Promise<GuardResult> {
  const { data: order, error: oErr } = await supabase
    .from('orders')
    .select('request_id')
    .eq('id', orderId)
    .single()

  if (oErr || !order) {
    return { allowed: false, reason: 'Commande introuvable pour vérification KYC.' }
  }

  const { data: request, error: rErr } = await supabase
    .from('import_requests')
    .select('buyer_id')
    .eq('id', order.request_id)
    .single()

  if (rErr || !request) {
    return { allowed: false, reason: 'Demande d\'import introuvable pour vérification KYC.' }
  }

  const { data: buyerProfile, error: bErr } = await supabase
    .from('buyer_profiles')
    .select('kyc_status')
    .eq('user_id', request.buyer_id)
    .single()

  if (bErr || !buyerProfile) {
    return {
      allowed: false,
      reason:
        'Profil acheteur introuvable. La vérification KYC est requise avant tout engagement financier.',
    }
  }

  if (buyerProfile.kyc_status !== 'VERIFIED') {
    return {
      allowed: false,
      reason:
        `Sécurité KYC : le dossier de l'acheteur doit être vérifié avant tout engagement financier (statut actuel : ${buyerProfile.kyc_status}).`,
    }
  }

  return { allowed: true }
}

// ─── Conformité : contrat partenaire ─────────────────────────────────────────

/**
 * Le contrat du partenaire assigné doit être ACTIVE avant autorisation du
 * sourcing (transition order FUNDED → SOURCING).
 */
export async function guardPartnerContractActive(
  supabase: SupabaseClient,
  orderId: string
): Promise<GuardResult> {
  const { data: order, error: oErr } = await supabase
    .from('orders')
    .select('request_id')
    .eq('id', orderId)
    .single()

  if (oErr || !order) {
    return {
      allowed: false,
      reason: 'Commande introuvable pour vérification du contrat partenaire.',
    }
  }

  const { data: request, error: rErr } = await supabase
    .from('import_requests')
    .select('assigned_partner_id')
    .eq('id', order.request_id)
    .single()

  if (rErr || !request) {
    return {
      allowed: false,
      reason: 'Demande d\'import introuvable pour vérification du contrat partenaire.',
    }
  }

  if (!request.assigned_partner_id) {
    return {
      allowed: false,
      reason:
        'Conformité : aucun partenaire assigné à cette commande. Un partenaire avec un contrat actif est requis avant d\'autoriser le sourcing.',
    }
  }

  const { data: partnerProfile, error: pErr } = await supabase
    .from('partner_profiles')
    .select('contract_status')
    .eq('id', request.assigned_partner_id)
    .single()

  if (pErr || !partnerProfile) {
    return {
      allowed: false,
      reason: 'Profil partenaire introuvable pour vérification du contrat.',
    }
  }

  if (partnerProfile.contract_status !== 'ACTIVE') {
    return {
      allowed: false,
      reason:
        `Conformité contrat : le contrat du partenaire assigné doit être actif avant d'autoriser le sourcing (statut : ${partnerProfile.contract_status}).`,
    }
  }

  return { allowed: true }
}

// ─── Douane : dossier libéré avant livraison ─────────────────────────────────

/**
 * Le dossier douanier lié à la commande doit être RELEASED avant de confirmer
 * la livraison (transition order SHIPPED → DELIVERED).
 */
export async function guardCustomsFileReleased(
  supabase: SupabaseClient,
  orderId: string
): Promise<GuardResult> {
  const { data: customsFile, error } = await supabase
    .from('customs_files')
    .select('id, status')
    .eq('order_id', orderId)
    .maybeSingle()

  if (error) {
    return { allowed: false, reason: 'Erreur lors de la vérification du dossier douanier.' }
  }

  if (!customsFile) {
    return {
      allowed: false,
      reason:
        'Douane : aucun dossier douanier créé pour cette commande. Le dédouanement doit être finalisé avant la confirmation de livraison.',
    }
  }

  if (customsFile.status !== 'RELEASED') {
    return {
      allowed: false,
      reason:
        `Douane : le dossier douanier doit être libéré (RELEASED) avant de confirmer la livraison (statut actuel : ${customsFile.status}).`,
    }
  }

  return { allowed: true }
}

// ─── Réglementation fiscale ───────────────────────────────────────────────────

/**
 * Toutes les déclarations du dossier doivent être validées fiscalement avant
 * le paiement des droits (transition customs LIQUIDATED → PAID).
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
    return {
      allowed: false,
      reason: 'Erreur lors de la vérification des validations fiscales.',
    }
  }

  if (!declarations || declarations.length === 0) {
    return {
      allowed: false,
      reason:
        'Réglementation fiscale : aucune déclaration douanière enregistrée. Une déclaration validée fiscalement est obligatoire avant le paiement des droits.',
    }
  }

  const pending = declarations.filter((d) => !d.is_fiscal_validated)
  if (pending.length > 0) {
    return {
      allowed: false,
      reason:
        `Réglementation fiscale : ${pending.length} déclaration(s) en attente de validation fiscale. Toutes les déclarations doivent être approuvées par le consultant fiscal avant le paiement.`,
    }
  }

  return { allowed: true }
}

// ─── Conformité comptable ─────────────────────────────────────────────────────

/**
 * Toutes les déclarations du dossier doivent être validées comptablement avant
 * la libération du dossier (transition customs PAID → RELEASED).
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
    return {
      allowed: false,
      reason: 'Erreur lors de la vérification des validations comptables.',
    }
  }

  if (!declarations || declarations.length === 0) {
    return {
      allowed: false,
      reason:
        'Conformité comptable : aucune déclaration douanière enregistrée. Une déclaration validée comptablement est requise avant la libération du dossier.',
    }
  }

  const pending = declarations.filter((d) => !d.is_accounting_validated)
  if (pending.length > 0) {
    return {
      allowed: false,
      reason:
        `Conformité comptable : ${pending.length} déclaration(s) en attente de validation comptable. Toutes les déclarations doivent être approuvées par le comptable avant la libération du dossier.`,
    }
  }

  return { allowed: true }
}

// ─── Dispatchers ─────────────────────────────────────────────────────────────

/**
 * Vérifie les prérequis de sécurité, conformité et douane pour une transition
 * de commande. Appelé après la vérification de rôle, avant l'exécution.
 *
 * Guards actifs :
 *   PENDING      → AWAITING_DEPOSIT : KYC acheteur VERIFIED
 *   FUNDED       → SOURCING         : contrat partenaire ACTIVE
 *   SHIPPED      → DELIVERED        : dossier douanier RELEASED
 */
export async function checkOrderTransitionGuards(
  supabase: SupabaseClient,
  orderId: string,
  currentStatus: OrderStatus,
  targetStatus: OrderStatus
): Promise<GuardResult> {
  if (currentStatus === 'PENDING' && targetStatus === 'AWAITING_DEPOSIT') {
    const result = await guardBuyerKycVerified(supabase, orderId)
    if (!result.allowed) return result
  }

  if (currentStatus === 'FUNDED' && targetStatus === 'SOURCING') {
    const result = await guardPartnerContractActive(supabase, orderId)
    if (!result.allowed) return result
  }

  if (currentStatus === 'SHIPPED' && targetStatus === 'DELIVERED') {
    const result = await guardCustomsFileReleased(supabase, orderId)
    if (!result.allowed) return result
  }

  return { allowed: true }
}

/**
 * Vérifie les prérequis réglementaires pour une transition douanière.
 * Appelé dans updateCustomsStatus après verifyTransitionAllowed.
 *
 * Guards actifs :
 *   LIQUIDATED → PAID     : validation fiscale complète
 *   PAID       → RELEASED : validation comptable complète
 */
export async function checkCustomsTransitionGuards(
  supabase: SupabaseClient,
  customsFileId: string,
  currentStatus: CustomsFileStatus,
  newStatus: CustomsFileStatus
): Promise<GuardResult> {
  if (currentStatus === 'LIQUIDATED' && newStatus === 'PAID') {
    const result = await guardFiscalValidated(supabase, customsFileId)
    if (!result.allowed) return result
  }

  if (currentStatus === 'PAID' && newStatus === 'RELEASED') {
    const result = await guardAccountingValidated(supabase, customsFileId)
    if (!result.allowed) return result
  }

  return { allowed: true }
}
