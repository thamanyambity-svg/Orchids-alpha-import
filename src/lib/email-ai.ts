/**
 * Assistant IA pour l'analyse des emails reçus sur contact@aonosekehouseinvestmentdrc.site
 * Utilise l'API OpenAI pour : catégorisation, priorité, résumé et suggestion de réponse
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export interface EmailAnalysis {
  category: string
  priority: string
  summary: string
  suggestedReply: string
}

const SYSTEM_PROMPT = `Tu es l'assistant IA d'Alpha Import Exchange, plateforme d'import B2B entre Kinshasa (RDC) et la Chine/Turquie/UAE/Japon.
Tu analyses les emails reçus sur contact@aonosekehouseinvestmentdrc.site.

Réponds UNIQUEMENT en JSON valide avec exactement ces clés :
{
  "category": "PARTENARIAT" | "INFO" | "RÉCLAMATION" | "PRESSE" | "AUTRE",
  "priority": "HAUTE" | "MOYENNE" | "BASSE",
  "summary": "résumé en 1-2 phrases",
  "suggestedReply": "proposition de réponse professionnelle et courtoise en français"
}

Règles :
- category PARTENARIAT : demande pour devenir partenaire, collaboration commerciale
- category INFO : demande d'information générale, tarifs, processus
- category RÉCLAMATION : plainte, problème, retard, incident
- category PRESSE : média, journalistes
- priority HAUTE : réclamations, partenariats stratégiques, urgence
- Le suggestedReply doit être prêt à envoyer, signé "L'équipe Alpha Import Exchange"
- Si l'email est en anglais, réponds en anglais dans summary et suggestedReply`

export async function analyzeEmail(
  from: string,
  subject: string,
  bodyText: string
): Promise<EmailAnalysis | null> {
  if (!OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY manquant - analyse IA désactivée')
    return null
  }

  const truncatedBody = bodyText?.slice(0, 4000) || subject // Limite tokens

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Analyse cet email reçu :\n\nDe: ${from}\nSujet: ${subject}\n\nCorps:\n${truncatedBody}`,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('OpenAI API error:', err)
      return null
    }

    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] }
    const content = data.choices?.[0]?.message?.content
    if (!content) return null

    const parsed = JSON.parse(content) as EmailAnalysis
    return {
      category: parsed.category || 'AUTRE',
      priority: parsed.priority || 'MOYENNE',
      summary: parsed.summary || '',
      suggestedReply: parsed.suggestedReply || '',
    }
  } catch (error) {
    console.error('Email AI analysis error:', error)
    return null
  }
}
