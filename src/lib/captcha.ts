/**
 * Vérification de captcha Cloudflare Turnstile (côté serveur).
 *
 * Comportement :
 *  - si TURNSTILE_SECRET_KEY n'est pas défini -> retourne true (désactivé en dev),
 *  - sinon -> valide le token auprès de Cloudflare (fail-closed si invalide).
 *
 * Wiring restant (à faire avec les clés Turnstile) :
 *  1. Ajouter le widget Turnstile sur les formulaires publics (contact, candidature
 *     partenaire, inscription) et envoyer le token au backend.
 *  2. Appeler `verifyTurnstile(token, ip)` avant tout traitement sensible.
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp?: string
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true // désactivé tant que la clé n'est pas configurée

  if (!token) return false

  try {
    const form = new URLSearchParams()
    form.append('secret', secret)
    form.append('response', token)
    if (remoteIp) form.append('remoteip', remoteIp)

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    })
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch (error) {
    console.error('Turnstile verification error:', error)
    return false
  }
}
