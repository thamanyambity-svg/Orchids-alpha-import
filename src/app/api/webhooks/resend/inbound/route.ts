import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { analyzeEmail } from '@/lib/email-ai'
import { verifySvixSignature } from '@/lib/webhook-verify'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET
// Le client d'administration est construit paresseusement dans lib/supabase/admin :
// des assertions non nulles au chargement du module faisaient échouer la
// compilation dans un environnement dépourvu de ces variables.

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
  // Vérification de signature Svix (Resend) — fail-closed.
  if (!RESEND_WEBHOOK_SECRET) {
    console.error('[resend] RESEND_WEBHOOK_SECRET non configuré')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  // Le corps brut est requis pour vérifier la signature (ne pas re-sérialiser).
  const rawBody = await request.text()
  if (!verifySvixSignature(rawBody, request.headers, RESEND_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  try {
    const event = JSON.parse(rawBody) as ResendInboundEvent

    if (event.type !== 'email.received') {
      return NextResponse.json({ received: false })
    }

    const { email_id, from, to, subject } = event.data
    const { email: fromEmail, name: fromName } = parseEmailAddress(from)

    const supabase = createAdminClient()

    // ------------------------------------------------------------------
    // Idempotence : on réclame l'e-mail AVANT tout travail coûteux.
    //
    // L'analyse appelle OpenAI — un appel facturé — et elle s'exécutait avant
    // l'insertion. resend_email_id étant UNIQUE, une livraison rejouée par
    // Resend payait l'appel, échouait ensuite en 23505, renvoyait 500, et
    // Resend rejouait : une boucle qui brûle du crédit sans jamais aboutir.
    //
    // La ligne minimale est posée d'abord ; un doublon est acquitté en 200,
    // comme le fait déjà le webhook Stripe. Contenu et analyse suivent, par
    // mise à jour.
    // ------------------------------------------------------------------
    const { error: claimError } = await supabase.from('inbound_emails').insert({
      resend_email_id: email_id,
      from_email: fromEmail,
      from_name: fromName || null,
      to_emails: to,
      subject: subject || null,
      status: 'PENDING',
    })

    if (claimError) {
      if ((claimError as { code?: string }).code === '23505') {
        console.log(`[resend] e-mail ${email_id} déjà reçu — ignoré (idempotence)`)
        return NextResponse.json({ ok: true, received: false, duplicate: true })
      }
      console.error('Inbound email claim error:', claimError)
      return NextResponse.json({ error: claimError.message }, { status: 500 })
    }

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

    // Analyse IA — appel facturé, exécuté une seule fois par e-mail puisque
    // la réclamation ci-dessus a déjà écarté les doublons.
    const analysis = await analyzeEmail(fromEmail, subject || '', bodyText || subject || '')

    const { error } = await supabase
      .from('inbound_emails')
      .update({
        body_text: bodyText || null,
        body_html: bodyHtml || null,
        ai_category: analysis?.category || null,
        ai_priority: analysis?.priority || null,
        ai_summary: analysis?.summary || null,
        ai_suggested_reply: analysis?.suggestedReply || null,
        ai_processed_at: analysis ? new Date().toISOString() : null,
      })
      .eq('resend_email_id', email_id)

    if (error) {
      // L'e-mail est déjà enregistré : renvoyer 500 ferait rejouer Resend sur
      // une livraison déjà acceptée. L'enrichissement manquant est signalé.
      console.error('Inbound email enrichment error:', error)
      return NextResponse.json({ ok: true, email_id, enriched: false })
    }

    return NextResponse.json({ ok: true, email_id })
  } catch (error) {
    console.error('Resend inbound webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
