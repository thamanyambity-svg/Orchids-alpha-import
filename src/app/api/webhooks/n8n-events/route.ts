import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifySharedSecret } from '@/lib/webhook-verify'

/** Le nom d'action est repris dans audit_logs : on le borne et on le nettoie. */
const ACTION_MAX = 40
const TAILLE_DETAILS_MAX = 16_000

function nettoyerAction(brut: string | null): string {
  const base = (brut ?? 'log').slice(0, ACTION_MAX)
  // Seuls lettres, chiffres, tiret et souligné : le journal d'audit est une
  // pièce de traçabilité, pas un champ libre.
  const propre = base.replace(/[^A-Za-z0-9_-]/g, '')
  return propre.length ? propre.toUpperCase() : 'LOG'
}

/**
 * Route de réception des événements n8n.
 * Les nœuds HTTP Request du workflow n8n doivent POST vers cette URL en
 * incluant le header `x-webhook-secret: <N8N_WEBHOOK_SECRET>`.
 * Enregistre les événements dans audit_logs pour traçabilité.
 */
export async function POST(request: NextRequest) {
  // Authentification du webhook par secret partagé (fail-closed).
  const secret = process.env.N8N_WEBHOOK_SECRET
  if (!secret) {
    console.error('[n8n] N8N_WEBHOOK_SECRET non configuré')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }
  if (!verifySharedSecret(request.headers.get('x-webhook-secret'), secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const action = nettoyerAction(searchParams.get('action'))

    const event = String(body?.event ?? body?.body?.event ?? 'unknown').slice(0, 200)
    const data = body?.data ?? body?.body?.data ?? body
    const timestamp = body?.timestamp ?? new Date().toISOString()

    // Le corps est écrit tel quel dans audit_logs. Non borné, un appelant
    // détenant le secret pouvait y déverser des mégaoctets à chaque appel.
    const detailsBruts = JSON.stringify({ event, data, timestamp })
    const details =
      detailsBruts.length > TAILLE_DETAILS_MAX
        ? { event, timestamp, tronque: true, taille_recue: detailsBruts.length }
        : { event, data, timestamp }

    // Optionnel : enregistrer dans audit_logs si Supabase configuré
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && serviceRoleKey) {
      const supabase = createAdminClient()

      // Événement système : acteur null -> affiché "Système" (plus de faux admin/UUID).
      await supabase.from('audit_logs').insert({
        actor_id: null,
        action: `N8N_${action}`,
        target_type: 'n8n_webhook',
        target_id: null,
        details,
        ip_address: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null,
        user_agent: request.headers.get('user-agent') ?? null,
      })
    } else {
      // Sans base configurée, l'événement n'est PAS tracé : le dire, plutôt
      // que de renvoyer un accusé qui ferait croire l'inverse.
      console.warn(`[n8n] ${action} non journalisé — Supabase non configuré :`, event)
      return NextResponse.json({ ok: true, received: event, persisted: false }, { status: 202 })
    }

    return NextResponse.json({ ok: true, received: event, persisted: true })
  } catch (error) {
    console.error('[n8n] Webhook error:', error)
    return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 })
  }
}
