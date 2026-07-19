import { NextResponse } from "next/server"

const store = new Map<string, { count: number; resetAt: number }>()

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { maxRequests: 60, windowMs: 60000 }
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = store.get(identifier)

  if (!entry || now > entry.resetAt) {
    store.set(identifier, { count: 1, resetAt: now + config.windowMs })
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs }
  }

  entry.count++
  const remaining = Math.max(0, config.maxRequests - entry.count)

  if (entry.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  return { allowed: true, remaining, resetAt: entry.resetAt }
}

// Backward-compatible API: rateLimit(key, maxRequests, windowMs)
export function rateLimit(key: string, maxRequests: number, windowMs: number) {
  const result = checkRateLimit(key, { maxRequests, windowMs })
  return result.allowed
}

export function rateLimitMiddleware(
  identifier: string,
  config?: RateLimitConfig
): NextResponse | null {
  const result = checkRateLimit(identifier, config)
  if (!result.allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez plus tard." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      }
    )
  }
  return null
}
