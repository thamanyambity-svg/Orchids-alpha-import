import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole, handleApiError } from '@/lib/auth-guard'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeE164 } from '@/lib/phone'

const createPartnerSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2),
  company_name: z.string().min(2),
  country_id: z.string().uuid(),
  whatsapp_number: z.string().min(1),
  phone: z.string().optional(),
  address_line: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  timezone: z.string().optional(),
  languages: z.array(z.string()).default([]),
  assigned_cities: z.array(z.string()).default([]),
  commission_rate: z.number().min(0).max(100).default(10),
  application_id: z.string().uuid().optional(),
})

/**
 * Création d'un partenaire opérationnel.
 *
 * Point unique de vérité : l'interface admin ne fait qu'appeler cette route, que
 * la création parte d'une candidature ou de rien. Elle crée le compte auth, corrige
 * le rôle du profil, insère les champs opérationnels, clôture la candidature
 * d'origine, et journalise.
 *
 * Aucun mot de passe n'est généré, affiché, stocké ni transmis : le partenaire
 * choisit le sien via le lien d'invitation.
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireRole(['ADMIN'])

    const rl = checkRateLimit(`partner-create:${user.id}`, { maxRequests: 10, windowMs: 60000 })
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const parsed = createPartnerSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // On refuse plutôt que de deviner l'indicatif : un mauvais pays enverrait les
    // messages du partenaire à un inconnu.
    const whatsapp = normalizeE164(parsed.data.whatsapp_number)
    if (!whatsapp) {
      return NextResponse.json(
        { error: 'whatsapp_number must include an international prefix, e.g. +8613812345678' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      parsed.data.email,
      {
        data: { full_name: parsed.data.full_name, role: 'PARTNER' },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
      }
    )

    if (inviteError || !invited?.user) {
      return NextResponse.json(
        { error: inviteError?.message || 'Invitation failed' },
        { status: 400 }
      )
    }

    const userId = invited.user.id

    try {
      // handle_new_user crée le profil en BUYER : sans cette bascule le partenaire
      // n'aurait aucun de ses droits.
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role: 'PARTNER',
          full_name: parsed.data.full_name,
          company_name: parsed.data.company_name,
          phone: parsed.data.phone ?? null,
          city: parsed.data.city ?? null,
          country_id: parsed.data.country_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (profileError) throw profileError

      const { data: partner, error: partnerError } = await supabase
        .from('partner_profiles')
        .insert({
          user_id: userId,
          country_id: parsed.data.country_id,
          whatsapp_number: whatsapp,
          address_line: parsed.data.address_line ?? null,
          postal_code: parsed.data.postal_code ?? null,
          timezone: parsed.data.timezone ?? null,
          languages: parsed.data.languages,
          assigned_cities: parsed.data.assigned_cities,
          commission_rate: parsed.data.commission_rate,
          contract_status: 'ACTIVE',
          application_id: parsed.data.application_id ?? null,
        })
        .select()
        .single()

      if (partnerError) throw partnerError

      if (parsed.data.application_id) {
        await supabase
          .from('partner_applications')
          .update({ status: 'ACTIVE', updated_at: new Date().toISOString() })
          .eq('id', parsed.data.application_id)
      }

      await logAudit({
        actorId: user.id,
        action: 'CREATE_PARTNER',
        targetType: 'partner_profiles',
        targetId: partner.id,
        details: { email: parsed.data.email, country_id: parsed.data.country_id },
      })

      return NextResponse.json({ id: partner.id, user_id: userId })
    } catch (error) {
      // Compensation : sans elle, l'adresse reste prise par un compte sans profil
      // et le partenaire devient impossible à recréer.
      const { error: cleanupError } = await admin.auth.admin.deleteUser(userId)
      if (cleanupError) {
        console.error(`Compte auth orphelin à supprimer manuellement : ${userId}`, cleanupError)
      }
      throw error
    }
  } catch (error) {
    return handleApiError(error)
  }
}
