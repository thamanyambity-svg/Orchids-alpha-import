/**
 * Rate-limiter en mémoire (fenêtre glissante), SANS dépendance externe.
 *
 * ⚠️ Limite : l'état est par instance/processus. Sur un déploiement serverless
 * multi-instances (Vercel), il ne partage pas le compteur entre instances.
 * Pour la production, remplacer par un store partagé (ex. Upstash Redis /
 * @vercel/kv) en gardant la même signature `rateLimit()`.
 */

type Bucket = { count: number; resetAt: number }

const store = new Map<string, Bucket>()

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

/**
 * @param key       identifiant logique (ex: `requests:${userId}` ou `n8n:${ip}`)
 * @param limit     nombre max d'appels dans la fenêtre
 * @param windowMs  durée de la fenêtre en millisecondes
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const bucket = store.get(key)

  if (!bucket || now >= bucket.resetAt) {
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { success: true, remaining: limit - 1, resetAt }
  }

  if (bucket.count >= limit) {
    return { success: false, remaining: 0, resetAt: bucket.resetAt }
  }

  bucket.count += 1
  return { success: true, remaining: limit - bucket.count, resetAt: bucket.resetAt }
}

/** Extrait une IP cliente depuis les en-têtes de proxy usuels. */
export function clientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  )
}
