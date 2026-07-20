/**
 * API Route: POST /api/agent/sourcing/send-rfq
 * Envoi officiel des RFQ aux fournisseurs approuvés
 * 
 * Déclenché par le Partner après validation de la shortlist.
 * L'Admin est systématiquement en CC sur chaque email envoyé.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

const ADMIN_CC_EMAILS = [
  'contact@aonosekehouseinvestmentdrc.site',
  'boobaunik@gmail.com',
]

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Vérifier que l'utilisateur est PARTNER ou ADMIN
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    if (!profile || !['PARTNER', 'ADMIN'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { session_id } = await req.json()
    if (!session_id) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 })
    }

    // Charger la session + demande associée
    const { data: session } = await supabaseAdmin
      .from('sourcing_sessions')
      .select(`
        *,
        request:import_requests(
          reference, category, quantity, unit, budget_min, budget_max, specifications,
          country:countries(name, code),
          buyer:profiles!buyer_id(full_name, company_name)
        )
      `)
      .eq('id', session_id)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.status === 'SENT') {
      return NextResponse.json({ error: 'RFQs already sent for this session' }, { status: 409 })
    }

    // Charger les matches approuvés
    const { data: approvedMatches } = await supabaseAdmin
      .from('sourcing_matches')
      .select(`
        *,
        supplier:suppliers(name, contact_email, contact_phone, language)
      `)
      .eq('session_id', session_id)
      .eq('status', 'APPROVED')

    if (!approvedMatches || approvedMatches.length === 0) {
      return NextResponse.json({ error: 'No approved matches to send' }, { status: 400 })
    }

    const request = session.request
    const sentResults: { supplier_id: string; success: boolean; error?: string }[] = []

    // Envoyer un email RFQ à chaque fournisseur approuvé
    for (const match of approvedMatches) {
      const supplier = match.supplier
      if (!supplier?.contact_email) {
        sentResults.push({ supplier_id: match.supplier_id, success: false, error: 'No email address' })
        continue
      }

      // Choisir le message: local si disponible, sinon anglais
      const rfqBody = match.rfq_message_local || match.rfq_message_en

      const subjectLine = `Request for Quotation — ${request.category} — ${request.quantity} ${request.unit || 'units'}`

      const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a2e; padding: 20px 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 18px;">Alpha Import Exchange</h1>
          <p style="color: #a0a0c0; margin: 2px 0 0; font-size: 13px;">B2B Import Facilitation Platform</p>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e0e0f0; white-space: pre-line; line-height: 1.7; font-size: 15px; color: #1a1a2e;">
${rfqBody}
        </div>
        ${match.rfq_message_local && match.rfq_message_local !== match.rfq_message_en ? `
        <div style="background: #f0f4ff; padding: 24px 32px; border: 1px solid #e0e0f0; border-top: none;">
          <p style="color: #2563eb; font-weight: bold; margin: 0 0 8px;">English version / Version anglaise :</p>
          <div style="white-space: pre-line; line-height: 1.7; font-size: 14px; color: #444;">
${match.rfq_message_en}
          </div>
        </div>` : ''}
        <div style="background: #e8e8f0; padding: 14px 24px; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; text-align: center;">
          Alpha Import Exchange · Ref: ${request.reference} · ${new Date().toLocaleDateString('en-US')}
        </div>
      </div>`

      try {
        const { data: emailData } = await resend.emails.send({
          from: 'Alpha Import Exchange Sourcing <sourcing@aonosekehouseinvestmentdrc.site>',
          to: [supplier.contact_email],
          cc: ADMIN_CC_EMAILS,
          subject: subjectLine,
          html: emailHtml,
          replyTo: 'sourcing@aonosekehouseinvestmentdrc.site',
        })

        // Mettre à jour le match avec la date d'envoi
        await supabaseAdmin
          .from('sourcing_matches')
          .update({
            status: 'SENT',
            email_sent_at: new Date().toISOString(),
            email_message_id: emailData?.id || null,
          })
          .eq('id', match.id)

        sentResults.push({ supplier_id: match.supplier_id, success: true })
      } catch (emailError: any) {
        console.error(`Failed to send RFQ to supplier ${match.supplier_id}:`, emailError)
        sentResults.push({ supplier_id: match.supplier_id, success: false, error: emailError.message })
      }
    }

    const allSent = sentResults.every(r => r.success)
    const newStatus = allSent ? 'SENT' : 'VALIDATED'

    // Mettre à jour le statut de la session
    await supabaseAdmin
      .from('sourcing_sessions')
      .update({
        status: newStatus,
        rfq_sent_at: allSent ? new Date().toISOString() : null,
        validated_by: user.id,
        validated_at: new Date().toISOString(),
      })
      .eq('id', session_id)

    // Log audit
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: user.id,
      action: 'RFQ_SENT',
      target_type: 'sourcing_sessions',
      target_id: session_id,
      details: { sent_count: sentResults.filter(r => r.success).length, results: sentResults },
    })

    return NextResponse.json({
      success: true,
      sent_count: sentResults.filter(r => r.success).length,
      failed_count: sentResults.filter(r => !r.success).length,
      results: sentResults,
    })

  } catch (error: any) {
    console.error('Send RFQ error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
