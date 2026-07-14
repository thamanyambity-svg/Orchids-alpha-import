import crypto from 'crypto'

/**
 * Vérification de signature des webhooks entrants.
 * Implémenté avec `crypto` natif (aucune dépendance externe).
 */

function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

/**
 * Compare un secret fourni (header) avec le secret attendu, à temps constant.
 * Utilisé pour les webhooks n8n (secret partagé via header x-webhook-secret).
 */
export function verifySharedSecret(
  provided: string | null | undefined,
  expected: string | undefined
): boolean {
  if (!provided || !expected) return false
  return timingSafeEqualStr(provided, expected)
}

/**
 * Vérifie une signature Svix (schéma utilisé par les webhooks Resend).
 * Headers attendus : svix-id, svix-timestamp, svix-signature.
 * Secret au format `whsec_<base64>`.
 *
 * @param rawBody  corps brut de la requête (string, NON re-sérialisé)
 * @param headers  Headers de la requête
 * @param secret   RESEND_WEBHOOK_SECRET
 * @param toleranceSeconds  fenêtre anti-rejeu (défaut 5 min)
 */
export function verifySvixSignature(
  rawBody: string,
  headers: Headers,
  secret: string | undefined,
  toleranceSeconds = 300
): boolean {
  if (!secret) return false

  const svixId = headers.get('svix-id')
  const svixTimestamp = headers.get('svix-timestamp')
  const svixSignature = headers.get('svix-signature')
  if (!svixId || !svixTimestamp || !svixSignature) return false

  // Anti-rejeu : le timestamp ne doit pas être trop ancien/futur.
  const ts = Number(svixTimestamp)
  if (!Number.isFinite(ts)) return false
  const nowSeconds = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSeconds - ts) > toleranceSeconds) return false

  // Calcul de la signature attendue.
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`
  const expected = crypto
    .createHmac('sha256', secretBytes)
    .update(signedContent)
    .digest('base64')

  // Le header peut contenir plusieurs signatures "v1,<sig>" séparées par des espaces.
  const passedSigs = svixSignature
    .split(' ')
    .map((part) => {
      const comma = part.indexOf(',')
      return comma === -1 ? part : part.slice(comma + 1)
    })

  return passedSigs.some((sig) => timingSafeEqualStr(sig, expected))
}
