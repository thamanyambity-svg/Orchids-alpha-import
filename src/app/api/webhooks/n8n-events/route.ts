import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifySharedSecret } from '@/lib/webhook-verify'

/**
 * Route de réception des événements n8n.
 * Les nœuds HTTP Request du workflow n8n doivent POST vers cette URL avec le
 * header `x-webhook-secret: <N8N_WEBHOOK_SECRET>`.
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
    const action = searchParams.get('action') || 'log'

    const event = body?.event ?? body?.body?.event ?? 'unknown'
    const data = body?.data ?? body?.body?.data ?? body
    const timestamp = body?.timestamp ?? new Date().toISOString()

    // Optionnel : enregistrer dans audit_logs si Supabase configuré
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && serviceRoleKey) {
      const supabase = createClient(supabaseUrl, serviceRoleKey)

      // Événement système : acteur null -> affiché "Système" (plus de faux admin/UUID).
      await supabase.from('audit_logs').insert({
        actor_id: null,
        action: `N8N_${action.toUpperCase()}`,
        target_type: 'n8n_webhook',
        target_id: null,
        details: { event, data, timestamp },
        ip_address: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null,
        user_agent: request.headers.get('user-agent') ?? null,
      })
    } else {
      console.log(`[n8n] ${action}:`, event, data)
    }

    return NextResponse.json({ ok: true, received: event })
  } catch (error) {
    console.error('[n8n] Webhook error:', error)
    return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 })
  }
}
