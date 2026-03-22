/**
 * customs-guard.ts — Guards de sécurité du module douanier
 *
 * IMPORTANT : `assigned_partner_id` sur import_requests / customs_files =
 * `partner_profiles.id`, pas `profiles.id`.
 *
 * Pas de directive "use server" ici : helpers importés par d'autres modules ;
 * seules les actions dans `app/actions/**` doivent la porter si exposées au client.
 */

import { createClient } from '@/lib/supabase/server'
import type { CustomsFileStatus } from '@/lib/customs/types'
import {
  normalizeCustomsActorRole,
  verifyTransitionAllowed as verifyTransitionAllowedMatrix,
} from '@/lib/customs/transition-matrix'

export type { CustomsFileStatus } from '@/lib/customs/types'

export type CustomsRole =
  | 'ADMIN'
  | 'PARTNER_COUNTRY'
  | 'PARTNER'
  | 'FISCAL_CONSULTANT'
  | 'ACCOUNTANT'

export interface CustomsAuthUser {
  id: string
  email: string
  role: string
}

export interface CustomsFileAccess {
  id: string
  order_id: string
  request_id: string
  status: CustomsFileStatus
  assigned_partner_id: string | null
  country_code: string
  transport_mode: string | null
}

export async function getPartnerProfileIdForSessionUser(
  userId: string
): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('partner_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.id ?? null
}

export async function requireCustomsRole(): Promise<CustomsAuthUser> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Non authentifié. Veuillez vous reconnecter.')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('Profil introuvable.')
  }

  const CUSTOMS_ROLES = [
    'ADMIN',
    'PARTNER_COUNTRY',
    'PARTNER',
    'FISCAL_CONSULTANT',
    'ACCOUNTANT',
  ] as const

  if (!CUSTOMS_ROLES.includes(profile.role as (typeof CUSTOMS_ROLES)[number])) {
    throw new Error(
      'Accès refusé. Ce module est réservé aux rôles douaniers ' +
        '(Admin, Partenaire Pays, Consultant Fiscal, Comptable).'
    )
  }

  return {
    id: profile.id,
    email: profile.email ?? '',
    role: profile.role,
  }
}

export async function verifyCustomsFileAccess(
  customsFileId: string,
  user: CustomsAuthUser
): Promise<CustomsFileAccess> {
  const supabase = await createClient()

  const { data: file, error } = await supabase
    .from('customs_files')
    .select(
      `
      id,
      order_id,
      request_id,
      status,
      assigned_partner_id,
      country_code,
      transport_mode
    `
    )
    .eq('id', customsFileId)
    .single()

  if (error || !file) {
    throw new Error('Dossier douanier introuvable ou accès non autorisé.')
  }

  const actor = normalizeCustomsActorRole(user.role)

  if (actor === 'PARTNER_COUNTRY') {
    const partnerId = await getPartnerProfileIdForSessionUser(user.id)
    if (!partnerId || file.assigned_partner_id !== partnerId) {
      console.warn(
        `[verifyCustomsFileAccess] Accès refusé : user=${user.id} partenaire=${partnerId} dossier=${customsFileId} assigné=${file.assigned_partner_id}`
      )
      throw new Error('Dossier douanier introuvable ou accès non autorisé.')
    }
  }

  return file as CustomsFileAccess
}

export function verifyTransitionAllowed(
  currentStatus: CustomsFileStatus,
  newStatus: CustomsFileStatus,
  role: string
): { allowed: boolean; reason?: string } {
  return verifyTransitionAllowedMatrix(currentStatus, newStatus, role)
}
