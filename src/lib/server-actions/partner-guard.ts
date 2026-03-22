/**
 * Guard partenaire centralisé — pages / actions partenaire douanes.
 */

import { createClient } from '@/lib/supabase/server'
import { fail, ok, type ServerActionResult } from '@/lib/server-actions/result'

export interface PartnerGateData {
  userId: string
  partnerProfileId: string
  role: string
  supabase: Awaited<ReturnType<typeof createClient>>
}

export async function requirePartner(): Promise<
  ServerActionResult<PartnerGateData>
> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return fail('Non authentifié.')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return fail('Profil introuvable.')
  }

  if (!['PARTNER', 'PARTNER_COUNTRY'].includes(profile.role)) {
    return fail('Accès réservé aux partenaires.')
  }

  const { data: partnerProfile, error: ppError } = await supabase
    .from('partner_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (ppError || !partnerProfile) {
    return fail(
      'Profil partenaire introuvable. ' +
        'Contactez l’administration pour régulariser votre compte.'
    )
  }

  return ok({
    userId: user.id,
    partnerProfileId: partnerProfile.id,
    role: profile.role,
    supabase,
  })
}

export async function verifyPartnerFileAccess(
  fileId: string,
  partnerProfileId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<boolean> {
  const { data, error } = await supabase
    .from('customs_files')
    .select('id')
    .eq('id', fileId)
    .eq('assigned_partner_id', partnerProfileId)
    .maybeSingle()

  return !error && !!data
}
