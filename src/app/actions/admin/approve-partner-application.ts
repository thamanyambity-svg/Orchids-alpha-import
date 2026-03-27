'use server'

import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/server-actions/admin-guard'
import { ok, fail, type ServerActionResult } from '@/lib/server-actions/result'

export interface ApprovePartnerResult {
  userId: string
  partnerProfileId: string
  /** Lien de définition du mot de passe à transmettre au partenaire. */
  passwordLink: string | null
}

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Configuration Supabase incomplète.')
  return createClient(url, key)
}

const APPROVABLE_STATUSES = ['PENDING', 'APPROVED_KYC', 'DEPOSIT_PAID'] as const

/**
 * Approuve une candidature partenaire :
 * 1. Crée le compte Auth Supabase (email_confirm = true)
 * 2. Insère `profiles` (role = PARTNER)
 * 3. Insère `partner_profiles` (country_id, contract_status = PENDING)
 * 4. Passe `partner_applications.status` à ACTIVE
 * 5. Génère un lien de premier mot de passe (recovery link)
 */
export async function approvePartnerApplication(
  applicationId: string,
  countryId: string
): Promise<ServerActionResult<ApprovePartnerResult>> {
  const gate = await requireAdmin()
  if (!gate.success) return gate

  if (!applicationId?.trim()) return fail('ID candidature manquant.')
  if (!countryId?.trim())
    return fail('Le pays est obligatoire pour activer le compte partenaire.')

  const supabaseAdmin = createAdminClient()

  // ── 1. Récupérer la candidature ──────────────────────────────────────────
  const { data: application, error: appError } = await supabaseAdmin
    .from('partner_applications')
    .select('id, email, company_name, phone, status')
    .eq('id', applicationId.trim())
    .single()

  if (appError || !application) return fail('Candidature introuvable.')

  if (!(APPROVABLE_STATUSES as readonly string[]).includes(application.status as string)) {
    return fail(
      `La candidature est dans le statut "${application.status}" et ne peut plus être approuvée.`
    )
  }

  const email = application.email as string
  const companyName = application.company_name as string
  const phone = (application.phone as string | null) ?? null

  // ── 2. Créer le compte Auth ───────────────────────────────────────────────
  const { data: createdUser, error: createUserError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { company_name: companyName },
    })

  if (createUserError) {
    if (createUserError.message?.toLowerCase().includes('already been registered')) {
      return fail(
        `Un compte existe déjà pour l'email ${email}. Vérifiez dans Supabase Auth.`
      )
    }
    return fail(`Erreur création compte Auth : ${createUserError.message}`)
  }

  const authUserId = createdUser.user.id

  // ── 3. Insérer le profil ──────────────────────────────────────────────────
  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: authUserId,
    role: 'PARTNER',
    status: 'PENDING',
    email,
    phone,
    full_name: null,
    company_name: companyName,
    country_id: countryId.trim(),
    mfa_enabled: false,
  })

  if (profileError) {
    const rollback = await supabaseAdmin.auth.admin.deleteUser(authUserId)
    if (rollback.error) {
      console.error('[approvePartnerApplication] rollback deleteUser failed', rollback.error)
    }
    return fail(`Erreur création profil : ${profileError.message}`)
  }

  // ── 4. Insérer le profil partenaire ───────────────────────────────────────
  const { data: partnerProfile, error: ppError } = await supabaseAdmin
    .from('partner_profiles')
    .insert({
      user_id: authUserId,
      country_id: countryId.trim(),
      assigned_cities: [],
      contract_status: 'PENDING',
      deposit_amount: 0,
      commission_rate: 0,
      performance_score: 0,
      total_orders_handled: 0,
    })
    .select('id')
    .single()

  if (ppError || !partnerProfile) {
    const profileDel = await supabaseAdmin.from('profiles').delete().eq('id', authUserId)
    if (profileDel.error) {
      console.error('[approvePartnerApplication] rollback profiles delete failed', profileDel.error)
    }
    const userDel = await supabaseAdmin.auth.admin.deleteUser(authUserId)
    if (userDel.error) {
      console.error('[approvePartnerApplication] rollback deleteUser failed', userDel.error)
    }
    return fail(
      `Erreur création profil partenaire : ${ppError?.message ?? 'inconnue'}`
    )
  }

  // ── 5. Mettre à jour le statut de la candidature ──────────────────────────
  await supabaseAdmin
    .from('partner_applications')
    .update({ status: 'ACTIVE' })
    .eq('id', applicationId.trim())

  // ── 6. Générer le lien de premier mot de passe (non bloquant) ─────────────
  let passwordLink: string | null = null
  try {
    const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
    })
    passwordLink = linkData?.properties?.action_link ?? null
  } catch {
    // Non bloquant : l'admin peut envoyer le lien manuellement
  }

  return ok({
    userId: authUserId,
    partnerProfileId: partnerProfile.id,
    passwordLink,
  })
}

/**
 * Rejette une candidature partenaire.
 */
export async function rejectPartnerApplication(
  applicationId: string
): Promise<ServerActionResult<void>> {
  const gate = await requireAdmin()
  if (!gate.success) return gate

  if (!applicationId?.trim()) return fail('ID candidature manquant.')

  const supabaseAdmin = createAdminClient()

  const { error } = await supabaseAdmin
    .from('partner_applications')
    .update({ status: 'REJECTED' })
    .eq('id', applicationId.trim())

  if (error) return fail(`Erreur rejet candidature : ${error.message}`)

  return ok(undefined)
}
