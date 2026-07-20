/**
 * API Route: POST /api/agent/sourcing
 * Agent IA de sourcing — moteur principal
 *
 * Déclenché automatiquement quand une demande passe en ANALYSIS.
 * 1. Récupère les specs de la demande + les suppliers du partenaire
 * 2. Appelle Gemini pour scorer et classer les fournisseurs
 * 3. Génère des messages RFQ en anglais + langue locale
 * 4. Stocke la session et les matches en base
 * 5. Notifie Partner + Admin par email
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL   = 'gemini-2.0-flash'

// CC emails constants
const ADMIN_CC_EMAILS = [
  'contact@aonosekehouseinvestmentdrc.site',
  'boobaunik@gmail.com',
]

// Map country code → language for RFQ translation
const COUNTRY_LANGUAGE_MAP: Record<string, { code: string; name: string }> = {
  CHN: { code: 'zh', name: 'Chinese (Simplified)' },
  ARE: { code: 'ar', name: 'Arabic' },
  TUR: { code: 'tr', name: 'Turkish' },
  JPN: { code: 'ja', name: 'Japanese' },
  THA: { code: 'th', name: 'Thai' },
  IND: { code: 'hi', name: 'Hindi' },
  KOR: { code: 'ko', name: 'Korean' },
  BRA: { code: 'pt', name: 'Portuguese' },
  DEU: { code: 'de', name: 'German' },
  FRA: { code: 'fr', name: 'French' },
  ITA: { code: 'it', name: 'Italian' },
  ESP: { code: 'es', name: 'Spanish' },
  RUS: { code: 'ru', name: 'Russian' },
  VNM: { code: 'vi', name: 'Vietnamese' },
  IDN: { code: 'id', name: 'Indonesian' },
  MYS: { code: 'ms', name: 'Malay' },
  PAK: { code: 'ur', name: 'Urdu' },
  BGD: { code: 'bn', name: 'Bengali' },
}

interface GeminiMatch {
  supplier_id: string
  score: number
  reason: string
  rfq_message_en: string
}

interface GeminiResponse {
  reasoning: string
  matches: GeminiMatch[]
}

// ─── Main Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Authentification: uniquement depuis l'intérieur (service role ou header secret)
    const authHeader = req.headers.get('x-agent-secret')
    if (authHeader !== process.env.AGENT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { request_id, partner_profile_id } = await req.json()

    if (!request_id || !partner_profile_id) {
      return NextResponse.json({ error: 'request_id and partner_profile_id are required' }, { status: 400 })
    }

    // ── Étape 1: Créer la session de sourcing en statut RUNNING ──────────────
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sourcing_sessions')
      .insert({
        request_id,
        partner_id: partner_profile_id,
        status: 'RUNNING',
        ai_model: GEMINI_MODEL,
      })
      .select()
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Failed to create sourcing session' }, { status: 500 })
    }

    // ── Étape 2: Charger la demande d'import ─────────────────────────────────
    const { data: request } = await supabaseAdmin
      .from('import_requests')
      .select(`
        *,
        country:countries(code, name),
        buyer:profiles!buyer_id(full_name, email, company_name)
      `)
      .eq('id', request_id)
      .single()

    if (!request) {
      await updateSessionFailed(session.id, 'Import request not found')
      return NextResponse.json({ error: 'Import request not found' }, { status: 404 })
    }

    const countryCode = request.country?.code || 'CHN'
    const localLang = COUNTRY_LANGUAGE_MAP[countryCode]

    // ── Étape 3: Charger les suppliers du partenaire (actifs et validés) ─────
    const { data: suppliers } = await supabaseAdmin
      .from('suppliers')
      .select('*')
      .eq('partner_id', partner_profile_id)
      .eq('status', 'ACTIVE')
      .eq('validated_by_admin', true)

    if (!suppliers || suppliers.length === 0) {
      await updateSessionFailed(session.id, 'No active suppliers found for this partner')
      await notifyNoSuppliers(session.id, request, partner_profile_id)
      return NextResponse.json({ error: 'No suppliers available', session_id: session.id }, { status: 200 })
    }

    // ── Étape 4: Appel Gemini — Scoring et RFQ ───────────────────────────────
    const geminiResult = await callGeminiSourcing(request, suppliers, localLang)

    if (!geminiResult || geminiResult.matches.length === 0) {
      await updateSessionFailed(session.id, 'AI found no suitable suppliers')
      return NextResponse.json({ error: 'No matches found', session_id: session.id }, { status: 200 })
    }

    // ── Étape 5: Traduction des RFQ en langue locale via Gemini ──────────────
    const matchesWithTranslation = await translateRFQMessages(geminiResult.matches, localLang, request)

    // ── Étape 6: Sauvegarder les matches ─────────────────────────────────────
    const matchRows = matchesWithTranslation.map(m => ({
      session_id: session.id,
      supplier_id: m.supplier_id,
      score: m.score,
      ai_reason: m.reason,
      rfq_message_en: m.rfq_message_en,
      rfq_message_local: m.rfq_message_local || m.rfq_message_en,
      status: 'PENDING',
    }))

    await supabaseAdmin.from('sourcing_matches').insert(matchRows)

    // ── Étape 7: Mettre à jour la session → PENDING_REVIEW ───────────────────
    await supabaseAdmin
      .from('sourcing_sessions')
      .update({
        status: 'PENDING_REVIEW',
        ai_reasoning: geminiResult.reasoning,
        suppliers_evaluated: suppliers.length,
        matches_count: matchesWithTranslation.length,
      })
      .eq('id', session.id)

    // ── Étape 8: Notifier le Partner et Admin par email ──────────────────────
    await notifyPartnerAndAdmin(session.id, request, partner_profile_id, matchesWithTranslation.length, suppliers)

    return NextResponse.json({
      success: true,
      session_id: session.id,
      matches_count: matchesWithTranslation.length,
      suppliers_evaluated: suppliers.length,
    })

  } catch (error: any) {
    console.error('Sourcing agent error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// ─── Gemini: Score et génère les RFQ ─────────────────────────────────────────

async function callGeminiSourcing(
  request: any,
  suppliers: any[],
  localLang: { code: string; name: string } | undefined
): Promise<GeminiResponse | null> {
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY manquant')
    return null
  }

  const specs = request.specifications || {}
  const suppliersForAI = suppliers.map(s => ({
    id: s.id,
    name: s.name,
    categories: s.categories || [],
    product_tags: s.product_tags || [],
    certifications: s.certifications || [],
    capacity: s.capacity || 'Non spécifié',
    rating: s.rating || 0,
    lead_time_days: s.lead_time_days || null,
    min_order_qty: s.min_order_qty || null,
    speciality: s.speciality || '',
    admin_notes: s.admin_notes || '',
  }))

  const buyerName  = request.buyer?.company_name || request.buyer?.full_name || 'Alpha Import Exchange Client'
  const langNote   = localLang ? `The local language of the supplier country is ${localLang.name}.` : ''

  const prompt = `You are the AI sourcing agent of Alpha Import Exchange, a secure B2B import facilitation platform.

## IMPORT REQUEST
- Reference: ${request.reference}
- Buyer: ${buyerName}
- Product Category: ${request.category}
- Specifications: ${JSON.stringify(specs, null, 2)}
- Quantity: ${request.quantity} ${request.unit || 'units'}
- Budget: $${request.budget_min} - $${request.budget_max} USD
- Destination: ${request.country?.name || 'DRC'}
- Deadline: ${request.deadline || 'Not specified'}

## AVAILABLE SUPPLIERS (internal database)
${JSON.stringify(suppliersForAI, null, 2)}

## YOUR MISSION
1. Analyze each supplier's fit for this request
2. Score each supplier from 0.0 to 10.0 based on: category match, capacity, rating, certifications, lead time
3. Select the TOP 3 suppliers (minimum score 6.0 to be included)
4. For each selected supplier, write a professional RFQ email in English
5. The RFQ must be specific, mentioning quantity, specs, requested certifications, and desired timeline
${langNote}

## RFQ EMAIL FORMAT
- Subject line not needed (just the body)
- Start with "Dear [Supplier Name],"
- Company introduction: "We are Alpha Import Exchange, a B2B import facilitation platform..."
- Clear product description from specs
- Specific quantity and packaging requirements
- Certification requirements if any
- Requested delivery terms (FOB/CIF)
- Response deadline: within 5 business days
- Sign: "Alpha Import Exchange Sourcing Team"

## RESPONSE FORMAT
Respond ONLY with valid JSON. No markdown, no code blocks, just raw JSON:
{
  "reasoning": "Brief explanation of your selection criteria and why these 3 suppliers were chosen",
  "matches": [
    {
      "supplier_id": "exact-uuid-from-suppliers-list",
      "score": 8.5,
      "reason": "Concise reason (1-2 sentences) why this supplier is a good match",
      "rfq_message_en": "Full RFQ email body in English"
    }
  ]
}

IMPORTANT: supplier_id must be the exact UUID from the suppliers list. Return max 3 matches sorted by score descending.`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.text()
      console.error('Gemini API error:', err)
      return null
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return null

    return JSON.parse(text) as GeminiResponse
  } catch (e) {
    console.error('Gemini sourcing call failed:', e)
    return null
  }
}

// ─── Gemini: Traduction des messages RFQ ─────────────────────────────────────

async function translateRFQMessages(
  matches: GeminiMatch[],
  localLang: { code: string; name: string } | undefined,
  request: any
): Promise<(GeminiMatch & { rfq_message_local?: string })[]> {
  if (!localLang || localLang.code === 'en' || !GEMINI_API_KEY) {
    return matches
  }

  const translated = await Promise.all(
    matches.map(async (match) => {
      try {
        const prompt = `Translate the following professional business email from English to ${localLang.name}.
Keep all technical terms, numbers, quantities, and company names exactly as they are.
Only translate the natural language parts. Keep it formal and professional.

ENGLISH ORIGINAL:
${match.rfq_message_en}

Respond with ONLY the translated text, nothing else.`

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
            }),
          }
        )

        const data = await response.json()
        const localText = data?.candidates?.[0]?.content?.parts?.[0]?.text
        return { ...match, rfq_message_local: localText || match.rfq_message_en }
      } catch {
        return { ...match, rfq_message_local: match.rfq_message_en }
      }
    })
  )

  return translated
}

// ─── Email: Notifier Partner + Admin ─────────────────────────────────────────

async function notifyPartnerAndAdmin(
  sessionId: string,
  request: any,
  partnerProfileId: string,
  matchesCount: number,
  suppliers: any[]
) {
  try {
    // Charger les infos du partenaire
    const { data: partnerProfile } = await supabaseAdmin
      .from('partner_profiles')
      .select('user_id, country_id')
      .eq('id', partnerProfileId)
      .single()

    const { data: partnerUser } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', partnerProfile?.user_id)
      .single()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://alpha-import.vercel.app'
    const sessionUrl = `${appUrl}/partner/sourcing/${sessionId}`
    const adminUrl = `${appUrl}/admin/sourcing`

    const emailSubject = `[Alpha Import Exchange] Shortlist de sourcing prête — ${request.reference}`

    const partnerEmailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1a1a2e; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Alpha Import Exchange</h1>
        <p style="color: #a0a0c0; margin: 4px 0 0;">Agent de Sourcing IA</p>
      </div>
      <div style="background: #f8f9ff; padding: 32px; border: 1px solid #e0e0f0;">
        <h2 style="color: #1a1a2e; margin-top: 0;">🤖 Shortlist de sourcing prête pour validation</h2>
        <p>Bonjour <strong>${partnerUser?.full_name || 'Partenaire'}</strong>,</p>
        <p>L'agent IA vient d'analyser la demande d'import suivante et a sélectionné <strong>${matchesCount} fournisseur(s)</strong> correspondant aux critères :</p>
        
        <div style="background: white; border: 1px solid #e0e0f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="color: #666; padding: 6px 0;">Référence</td><td style="font-weight: bold;">${request.reference}</td></tr>
            <tr><td style="color: #666; padding: 6px 0;">Catégorie</td><td style="font-weight: bold;">${request.category}</td></tr>
            <tr><td style="color: #666; padding: 6px 0;">Quantité</td><td style="font-weight: bold;">${request.quantity} ${request.unit || ''}</td></tr>
            <tr><td style="color: #666; padding: 6px 0;">Budget</td><td style="font-weight: bold;">$${request.budget_min} – $${request.budget_max}</td></tr>
            <tr><td style="color: #666; padding: 6px 0;">Fournisseurs analysés</td><td style="font-weight: bold;">${suppliers.length}</td></tr>
            <tr><td style="color: #666; padding: 6px 0;">Matches retenus</td><td style="font-weight: bold; color: #16a34a;">${matchesCount}</td></tr>
          </table>
        </div>

        <p><strong>Action requise :</strong> Veuillez consulter la shortlist, approuver ou rejeter chaque fournisseur proposé, puis valider l'envoi des RFQ.</p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${sessionUrl}" style="background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
            Voir la shortlist et valider →
          </a>
        </div>

        <p style="color: #666; font-size: 13px;">Cette session expirera dans 48h si aucune action n'est prise.</p>
      </div>
      <div style="background: #e8e8f0; padding: 16px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #666;">
        Alpha Import Exchange — ${new Date().toLocaleDateString('fr-FR')} — Admin CC: contact@aonosekehouseinvestmentdrc.site
      </div>
    </div>`

    // Email au partenaire
    if (partnerUser?.email) {
      await resend.emails.send({
        from: 'Alpha Import Exchange <noreply@aonosekehouseinvestmentdrc.site>',
        to: [partnerUser.email],
        cc: ADMIN_CC_EMAILS,
        subject: emailSubject,
        html: partnerEmailHtml,
      })
    }
  } catch (e) {
    console.error('Failed to send sourcing notification email:', e)
  }
}

// ─── Cas: Pas de suppliers disponibles ───────────────────────────────────────

async function notifyNoSuppliers(sessionId: string, request: any, partnerProfileId: string) {
  try {
    const { data: partnerProfile } = await supabaseAdmin
      .from('partner_profiles')
      .select('user_id')
      .eq('id', partnerProfileId)
      .single()

    const { data: partnerUser } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', partnerProfile?.user_id)
      .single()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://alpha-import.vercel.app'

    await resend.emails.send({
      from: 'Alpha Import Exchange <noreply@aonosekehouseinvestmentdrc.site>',
      to: ADMIN_CC_EMAILS,
      cc: partnerUser?.email ? [partnerUser.email] : [],
      subject: `[ALERTE] Aucun fournisseur disponible — ${request.reference}`,
      html: `<p>L'agent de sourcing n'a trouvé aucun fournisseur actif et validé pour la demande <strong>${request.reference}</strong>.</p>
             <p>Partenaire concerné: ${partnerUser?.full_name} (${partnerUser?.email})</p>
             <p>Action requise: Ajouter des fournisseurs dans la base ou assigner manuellement.</p>
             <p><a href="${appUrl}/admin/sourcing">Voir dans l'admin →</a></p>`,
    })
  } catch (e) {
    console.error('Failed to send no-suppliers alert:', e)
  }
}

// ─── Helper: Mettre à jour session en FAILED ─────────────────────────────────

async function updateSessionFailed(sessionId: string, errorMessage: string) {
  await supabaseAdmin
    .from('sourcing_sessions')
    .update({ status: 'FAILED', error_message: errorMessage })
    .eq('id', sessionId)
}
