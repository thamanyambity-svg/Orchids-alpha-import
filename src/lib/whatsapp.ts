import { normalizeE164, waMeLink } from "@/lib/phone"
import { sendToN8N } from "@/lib/webhooks"

export type WhatsAppTransport = "link" | "n8n" | "cloud"

export type WhatsAppResult = {
  delivered: boolean
  link: string | null
  error?: "invalid_number" | "transport_failed" | "transport_unavailable"
}

const TRANSPORTS: WhatsAppTransport[] = ["link", "n8n", "cloud"]

/**
 * Transport actif. Toute valeur inconnue retombe sur 'link' : une variable
 * d'environnement mal orthographiée ne doit pas empêcher l'application de démarrer.
 */
export function resolveTransport(): WhatsAppTransport {
  const configured = process.env.WHATSAPP_TRANSPORT as WhatsAppTransport | undefined
  return configured && TRANSPORTS.includes(configured) ? configured : "link"
}

/**
 * Envoie un message WhatsApp selon le transport configuré.
 *
 * Ne lève jamais : une notification qui échoue ne doit pas annuler l'opération
 * métier qui l'a déclenchée. Même contrat que `sendToN8N`, qui capture déjà ses
 * propres erreurs.
 *
 * - `link`  : aucun appel réseau, produit seulement l'URL wa.me à afficher.
 * - `n8n`   : émet l'évènement, n8n décide du fournisseur et du moment.
 * - `cloud` : appel direct à l'API WhatsApp Business de Meta.
 */
export async function sendWhatsApp(params: {
  to: string
  message: string
  event: string
}): Promise<WhatsAppResult> {
  const to = normalizeE164(params.to)
  if (!to) return { delivered: false, link: null, error: "invalid_number" }

  const link = waMeLink(to, params.message)
  const transport = resolveTransport()

  if (transport === "link") {
    return { delivered: false, link }
  }

  try {
    if (transport === "n8n") {
      await sendToN8N(`whatsapp:${params.event}`, { to, message: params.message })
      return { delivered: true, link }
    }

    const token = process.env.WHATSAPP_CLOUD_TOKEN
    const phoneId = process.env.WHATSAPP_CLOUD_PHONE_ID
    if (!token || !phoneId) {
      console.warn("sendWhatsApp: transport 'cloud' sélectionné mais non configuré")
      return { delivered: false, link, error: "transport_unavailable" }
    }

    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.slice(1),
        type: "text",
        text: { body: params.message },
      }),
    })

    if (!response.ok) throw new Error(`WhatsApp Cloud API: ${response.status}`)
    return { delivered: true, link }
  } catch (error) {
    console.error(`sendWhatsApp(${params.event}) a échoué :`, error)
    return { delivered: false, link, error: "transport_failed" }
  }
}
