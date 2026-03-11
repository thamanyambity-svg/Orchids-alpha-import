import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { analyzeEmail } from '@/lib/email-ai'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface ResendInboundEvent {
  type: 'email.received'
  data: {
    email_id: string
    from: string
    to: string[]
    subject?: string
    created_at?: string
  }
}

function parseEmailAddress(raw: string): { email: string; name?: string } {
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/)
  if (match) {
    return { name: match[1].trim().replace(/^["']|["']$/g, ''), email: match[2].trim() }
  }
  return { email: raw.trim() }
}

/**
 * Webhook Resend - email.received
 * Reçoit les emails envoyés à contact@aonosekehouseinvestmentdrc.site
 * Configurer dans Resend Dashboard > Webhooks > email.received
 */
export async function POST(request: NextRequest) {
  try {
    const event = (await request.json()) as ResendInboundEvent

    if (event.type !== 'email.received') {
      return NextResponse.json({ received: false })
    }

    const { email_id, from, to, subject } = event.data

    // Récupérer le contenu complet via l'API Resend
    let bodyText = ''
    let bodyHtml = ''

    if (RESEND_API_KEY) {
      const res = await fetch(`https://api.resend.com/emails/receiving/${email_id}`, {
        headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
      })
      if (res.ok) {
        const emailContent = await res.json()
        bodyText = emailContent.text || emailContent.body?.text || ''
        bodyHtml = emailContent.html || emailContent.body?.html || ''
      }
    }

    const { email: fromEmail, name: fromName } = parseEmailAddress(from)

    // Analyse IA
    const analysis = await analyzeEmail(fromEmail, subject || '', bodyText || subject || '')

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { error } = await supabase.from('inbound_emails').insert({
      resend_email_id: email_id,
      from_email: fromEmail,
      from_name: fromName || null,
      to_emails: to,
      subject: subject || null,
      body_text: bodyText || null,
      body_html: bodyHtml || null,
      ai_category: analysis?.category || null,
      ai_priority: analysis?.priority || null,
      ai_summary: analysis?.summary || null,
      ai_suggested_reply: analysis?.suggestedReply || null,
      ai_processed_at: analysis ? new Date().toISOString() : null,
      status: 'PENDING',
    })

    if (error) {
      console.error('Inbound email insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, email_id })
  } catch (error) {
    console.error('Resend inbound webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
