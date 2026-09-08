import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Limitation de débit des routes d'API.
 *
 * Le compteur lui-même est éprouvé ailleurs ; ce qui est vérifié ici est
 * l'attribution des budgets, c'est-à-dire la décision de politique.
 *
 * Deux propriétés portent l'essentiel.
 *
 * La première est l'ordre : les préfixes vont du plus spécifique au plus
 * général et la première correspondance gagne. Si `/api/` était consulté avant
 * `/api/payments/`, toutes les routes d'argent hériteraient du budget large et
 * la protection disparaîtrait sans qu'aucun test ne s'en aperçoive.
 *
 * La seconde est le regroupement par famille : compter par route exacte
 * laisserait un appelant multiplier son budget en changeant d'URL.
 */

const checkRateLimit = vi.fn()

vi.mock("./rate-limit", () => ({
  checkRateLimit: (...a: any[]) => checkRateLimit(...a),
}))

const { limiterApi } = await import("./api-rate-limit")

function requete(chemin: string, ip = "203.0.113.8") {
  return {
    nextUrl: { pathname: chemin },
    headers: { get: (k: string) => (k.toLowerCase() === "x-forwarded-for" ? ip : null) },
  } as any
}

function budgetUtilise() {
  return checkRateLimit.mock.calls[0]?.[1] as { maxRequests: number; windowMs: number }
}

function cleUtilisee() {
  return checkRateLimit.mock.calls[0]?.[0] as string
}

beforeEach(() => {
  vi.clearAllMocks()
  checkRateLimit.mockReturnValue({ allowed: true, remaining: 5, resetAt: Date.now() + 60000 })
})

describe("attribution des budgets", () => {
  it("applique un budget strict aux routes de paiement", () => {
    limiterApi(requete("/api/payments/process-sepa-debit"))
    expect(budgetUtilise().maxRequests).toBe(10)
  })

  it("ne laisse pas les routes de paiement hériter du budget général", () => {
    // La régression redoutée : un préfixe général placé trop tôt.
    limiterApi(requete("/api/payments/process-sepa-debit"))
    expect(budgetUtilise().maxRequests).not.toBe(120)
  })

  it("applique un budget horaire très étroit à l'inscription à la lettre d'information", () => {
    limiterApi(requete("/api/newsletter/subscribe"))
    expect(budgetUtilise()).toMatchObject({ maxRequests: 5, windowMs: 3_600_000 })
  })

  it("borne la remontée d'erreurs du navigateur, qui est publique en écriture", () => {
    // Sans ce budget, une page en boucle d'erreur écrit sans fin.
    limiterApi(requete("/api/monitoring/error"))
    expect(budgetUtilise().maxRequests).toBe(20)
  })

  it("laisse au back-office un budget de lecture confortable", () => {
    limiterApi(requete("/api/admin/errors"))
    expect(budgetUtilise().maxRequests).toBe(240)
  })

  it("accorde un budget large aux webhooks signés", () => {
    limiterApi(requete("/api/webhooks/stripe"))
    expect(budgetUtilise().maxRequests).toBe(300)
  })

  it("retombe sur le budget applicatif pour une route non listée", () => {
    limiterApi(requete("/api/requests/list"))
    expect(budgetUtilise().maxRequests).toBe(120)
  })

  it("ne limite pas ce qui n'est pas une route d'API", () => {
    expect(limiterApi(requete("/dashboard"))).toBeNull()
    expect(checkRateLimit).not.toHaveBeenCalled()
  })
})

describe("regroupement des appelants", () => {
  it("regroupe par famille, pas par route exacte", () => {
    // Sinon il suffit de varier l'URL pour multiplier son budget.
    limiterApi(requete("/api/payments/a"))
    const premiere = cleUtilisee()
    vi.clearAllMocks()
    limiterApi(requete("/api/payments/b"))
    expect(cleUtilisee()).toBe(premiere)
  })

  it("sépare deux appelants distincts", () => {
    limiterApi(requete("/api/payments/a", "203.0.113.8"))
    const premiere = cleUtilisee()
    vi.clearAllMocks()
    limiterApi(requete("/api/payments/a", "198.51.100.4"))
    expect(cleUtilisee()).not.toBe(premiere)
  })

  it("ne confond pas deux familles différentes", () => {
    limiterApi(requete("/api/payments/a"))
    const paiements = cleUtilisee()
    vi.clearAllMocks()
    limiterApi(requete("/api/newsletter/subscribe"))
    expect(cleUtilisee()).not.toBe(paiements)
  })

  it("ne fait pas confiance aveuglément à une liste d'adresses relayées", () => {
    // x-forwarded-for peut être une chaîne : seule la première compte.
    limiterApi(requete("/api/payments/a", "203.0.113.8, 10.0.0.1, 172.16.0.1"))
    expect(cleUtilisee()).toContain("203.0.113.8")
    expect(cleUtilisee()).not.toContain("10.0.0.1")
  })
})

describe("dépassement", () => {
  it("répond 429 avec le délai d'attente et le plafond", async () => {
    checkRateLimit.mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 30_000 })

    const res = limiterApi(requete("/api/payments/a"))!

    expect(res.status).toBe(429)
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0)
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0")
    expect(res.headers.get("X-RateLimit-Limit")).toBe("10")
  })

  it("annonce au moins une seconde d'attente, jamais zéro", async () => {
    // Un Retry-After à 0 invite à réessayer immédiatement, ce qui aggrave la charge.
    checkRateLimit.mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() - 5000 })

    const res = limiterApi(requete("/api/payments/a"))!

    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThanOrEqual(1)
  })

  it("laisse passer quand le budget n'est pas épuisé", () => {
    expect(limiterApi(requete("/api/payments/a"))).toBeNull()
  })
})
