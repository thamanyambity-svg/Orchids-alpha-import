import { describe, it, expect } from "vitest"
import nextConfig from "../../next.config"

/**
 * En-têtes de sécurité servis sur toutes les routes.
 *
 * La CSP est la seule règle du projet dont une erreur ne se voit ni au
 * typecheck, ni au build, ni dans les tests d'API : elle n'existe qu'en
 * en-tête HTTP. Une origine oubliée casse silencieusement une fonction
 * entière du site, et seule la console du navigateur le dit.
 *
 * C'est arrivé : Stripe était absent de la CSP, `loadStripe` était refusé, et
 * le mandat SEPA échouait en production alors que tout le reste était vert.
 * Ces tests figent les origines dont dépend un paiement.
 */

async function entetes(source: string) {
  const regles = await nextConfig.headers!()
  const regle = regles.find((r) => r.source === source)
  if (!regle) throw new Error(`Aucune règle d'en-têtes pour ${source}`)
  return Object.fromEntries(regle.headers.map((h) => [h.key.toLowerCase(), h.value]))
}

async function csp() {
  const h = await entetes("/:path*")
  const valeur = h["content-security-policy"]
  expect(valeur, "CSP absente des en-têtes globaux").toBeDefined()
  return Object.fromEntries(
    valeur.split(";").map((d) => {
      const [nom, ...origines] = d.trim().split(/\s+/)
      return [nom, origines]
    })
  ) as Record<string, string[]>
}

describe("Content-Security-Policy", () => {
  it("autorise le script Stripe, sans quoi aucun mandat SEPA n'est signable", async () => {
    expect((await csp())["script-src"]).toContain("https://js.stripe.com")
  })

  it("autorise l'iframe Stripe — elle est servie par js.stripe.com, pas par 'self'", async () => {
    const directives = await csp()
    // Sans frame-src explicite, la directive retombe sur default-src 'self' et
    // l'iframe de collecte est refusée.
    expect(directives["frame-src"]).toBeDefined()
    expect(directives["frame-src"]).toContain("https://js.stripe.com")
  })

  it("autorise la redirection 3-D Secure de Stripe", async () => {
    expect((await csp())["frame-src"]).toContain("https://hooks.stripe.com")
  })

  it("autorise les appels à l'API Stripe", async () => {
    expect((await csp())["connect-src"]).toContain("https://api.stripe.com")
  })

  it("autorise Supabase en HTTP et en websocket", async () => {
    const connect = (await csp())["connect-src"]
    expect(connect).toContain("https://*.supabase.co")
    // Le temps réel passe par un websocket : https:// ne le couvre pas.
    expect(connect).toContain("wss://*.supabase.co")
  })

  it("garde une politique par défaut restrictive", async () => {
    const directives = await csp()
    expect(directives["default-src"]).toEqual(["'self'"])
    expect(directives["object-src"]).toEqual(["'none'"])
    expect(directives["base-uri"]).toEqual(["'self'"])
  })

  it("n'ouvre jamais une directive au joker total", async () => {
    // '*' dans script-src ou connect-src annule l'intérêt de la CSP.
    for (const nom of ["script-src", "connect-src", "frame-src", "default-src"]) {
      expect((await csp())[nom] ?? [], nom).not.toContain("*")
    }
  })

  it("interdit l'encadrement du site par un tiers — anti-clickjacking", async () => {
    const h = await entetes("/:path*")
    expect((await csp())["frame-ancestors"]).toEqual(["'self'"])
    expect(h["x-frame-options"]).toBe("SAMEORIGIN")
  })

  it("impose HTTPS durablement", async () => {
    const h = await entetes("/:path*")
    const hsts = h["strict-transport-security"]
    const age = Number(/max-age=(\d+)/.exec(hsts)?.[1])
    // Moins d'un an ne qualifie pas pour la liste de préchargement.
    expect(age).toBeGreaterThanOrEqual(31536000)
    expect(hsts).toContain("includeSubDomains")
  })

  it("bloque le reniflage de type et fuite de référent", async () => {
    const h = await entetes("/:path*")
    expect(h["x-content-type-options"]).toBe("nosniff")
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin")
  })
})
