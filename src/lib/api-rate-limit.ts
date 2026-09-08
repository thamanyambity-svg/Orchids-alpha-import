import { NextResponse, type NextRequest } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"

/**
 * Limitation de débit appliquée à toutes les routes /api, depuis le middleware.
 *
 * Elle était présente sur 14 routes sur 46, écrite à la main dans chacune.
 * Un point unique garantit qu'aucune route nouvelle ne naisse sans protection,
 * et rend les budgets lisibles au même endroit.
 *
 * LIMITE ASSUMÉE : le compteur sous-jacent est une Map en mémoire du processus.
 * Sur une plateforme sans état comme Vercel, deux requêtes peuvent tomber sur
 * deux instances et chacune repart de zéro. C'est donc un garde-fou contre les
 * boucles et les scripts naïfs, pas une défense contre une attaque distribuée.
 * Une vraie protection demande un compteur partagé — Upstash Redis, ou le
 * pare-feu de Vercel.
 */

interface Budget {
  maxRequests: number
  windowMs: number
}

const MINUTE = 60_000
const HEURE = 3_600_000

/**
 * Budgets par préfixe, du plus spécifique au plus général : la première
 * correspondance gagne.
 */
const BUDGETS: [string, Budget][] = [
  // Signés et appelés par des systèmes tiers : généreux, mais borné.
  ["/api/webhooks/", { maxRequests: 300, windowMs: MINUTE }],

  // Écriture d'argent ou d'engagement : strict.
  ["/api/payments/", { maxRequests: 10, windowMs: MINUTE }],
  ["/api/payment/", { maxRequests: 10, windowMs: MINUTE }],
  ["/api/stripe/", { maxRequests: 10, windowMs: MINUTE }],
  ["/api/purchase-orders/", { maxRequests: 20, windowMs: MINUTE }],
  ["/api/payment-proofs", { maxRequests: 20, windowMs: MINUTE }],
  ["/api/invoices/", { maxRequests: 20, windowMs: MINUTE }],

  // Coûteux : appels à un modèle et envois d'e-mails.
  ["/api/agent/", { maxRequests: 15, windowMs: HEURE }],

  // Ouvert aux visiteurs : très strict.
  ["/api/newsletter/", { maxRequests: 5, windowMs: HEURE }],

  // Remontée d'erreurs depuis le navigateur. Ouverte par nécessité — une
  // erreur survient souvent avant toute authentification, et c'est justement
  // celle-là qu'on veut voir. Le budget reste étroit : une page en boucle
  // d'erreur ne doit pas pouvoir écrire sans fin, et un tiers ne doit pas
  // pouvoir noyer le tableau de bord sous du bruit fabriqué.
  ["/api/monitoring/", { maxRequests: 20, windowMs: MINUTE }],

  // Back-office : lecture fréquente par des comptes connus.
  ["/api/admin/", { maxRequests: 240, windowMs: MINUTE }],

  // Défaut applicatif.
  ["/api/", { maxRequests: 120, windowMs: MINUTE }],
]

function budgetPour(chemin: string): Budget | null {
  for (const [prefixe, budget] of BUDGETS) {
    if (chemin.startsWith(prefixe)) return budget
  }
  return null
}

/** Identifiant de l'appelant : l'adresse vue par la plateforme. */
function identifiant(request: NextRequest): string {
  const entete = request.headers.get("x-forwarded-for")
  if (entete) return entete.split(",")[0].trim()
  return request.headers.get("x-real-ip") ?? "inconnu"
}

/**
 * Renvoie une réponse 429 quand le budget est dépassé, sinon null pour laisser
 * la requête poursuivre.
 */
export function limiterApi(request: NextRequest): NextResponse | null {
  const chemin = request.nextUrl.pathname
  const budget = budgetPour(chemin)
  if (!budget) return null

  // On regroupe par famille plutôt que par route exacte : sinon un appelant
  // peut multiplier son budget en variant l'URL.
  const famille = BUDGETS.find(([p]) => chemin.startsWith(p))?.[0] ?? "/api/"
  const cle = `${identifiant(request)}:${famille}`

  const resultat = checkRateLimit(cle, budget)
  if (resultat.allowed) return null

  const secondes = Math.max(1, Math.ceil((resultat.resetAt - Date.now()) / 1000))
  return NextResponse.json(
    { error: "Trop de requêtes. Réessayez plus tard." },
    {
      status: 429,
      headers: {
        "Retry-After": String(secondes),
        "X-RateLimit-Limit": String(budget.maxRequests),
        "X-RateLimit-Remaining": "0",
      },
    }
  )
}
