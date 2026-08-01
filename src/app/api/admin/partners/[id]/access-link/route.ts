import { NextRequest, NextResponse } from 'next/server'
import { requireRole, handleApiError } from '@/lib/auth-guard'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Lien de connexion à usage unique, transmis par l'administrateur lui-même.
 *
 * Utile tant que l'adresse professionnelle du partenaire n'est pas opérationnelle,
 * ou quand l'invitation par email n'arrive pas. Aucun mot de passe n'est généré
 * ni transmis : le partenaire choisit le sien après avoir suivi le lien.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { supabase, user } = await requireRole(['ADMIN'])

    const rl = checkRateLimit(`access-link:${user.id}`, { maxRequests: 10, windowMs: 60000 })
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const { data: partner } = await supabase
      .from('partner_profiles')
      .select('id, user_id, profile:profiles!user_id(email)')
      .eq('id', id)
      .single()

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }

    const email = (partner as any).profile?.email
    if (!email) {
      return NextResponse.json({ error: 'Partner has no email address' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })

    if (error || !data?.properties?.action_link) {
      return NextResponse.json(
        { error: error?.message || 'Link generation failed' },
        { status: 400 }
      )
    }

    await logAudit({
      actorId: user.id,
      action: 'GENERATE_PARTNER_ACCESS_LINK',
      targetType: 'partner_profiles',
      targetId: id,
      details: { email },
    })

    return NextResponse.json({ link: data.properties.action_link })
  } catch (error) {
    return handleApiError(error)
  }
}
