import { describe, it, expect } from "vitest"
import { readdirSync, existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

/**
 * Couverture des routes serveur.
 *
 * Une route sans test est une route dont personne ne vérifie le contrôle
 * d'accès. Les routes héritées listées ci-dessous n'en ont pas encore : la
 * liste ne doit que raccourcir. Toute route ajoutée ou déplacée à partir
 * d'aujourd'hui doit arriver avec son fichier de tests.
 */

const RACINE = "src/app/api"

/** Routes héritées sans tests, à résorber. N'ajoutez rien ici. */
const DETTE = new Set([
  "admin/dashboard",
  "admin/notifications",
  "admin/notifications/partner-application",
  "admin/payment-proofs",
  "admin/reminders/trigger",
  "admin/reporting/export",
  "admin/reporting/stats",
  "agent/sourcing",
  "agent/sourcing/send-rfq",
  "customs/files/[id]",
  "customs/files/[id]/declaration",
  "customs/tax-types",
  "newsletter/subscribe",
  "notifications",
  "notifications/mark-read",
  "partner/requests/status",
  "requests",
])

function routes(dossier = RACINE): string[] {
  const trouvees: string[] = []
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, entree.name)
    if (entree.isDirectory()) trouvees.push(...routes(chemin))
    else if (entree.name === "route.ts") trouvees.push(dossier.slice(RACINE.length + 1))
  }
  return trouvees
}

const TOUTES = routes()

describe("couverture des routes serveur", () => {
  it("trouve bien les routes du projet", () => {
    expect(TOUTES.length).toBeGreaterThan(40)
  })

  it("chaque route a ses tests, hors dette héritée", () => {
    const sansTests = TOUTES.filter((r) => !existsSync(join(RACINE, r, "route.test.ts")) && !DETTE.has(r))
    expect(sansTests, "routes sans fichier de tests").toEqual([])
  })

  it("la dette ne contient que des routes qui existent encore et restent sans tests", () => {
    // Une route de la dette qui a reçu ses tests — ou qui a disparu — doit
    // sortir de la liste, sinon la liste cesse de dire la vérité.
    const obsoletes = [...DETTE].filter((r) => !TOUTES.includes(r) || existsSync(join(RACINE, r, "route.test.ts")))
    expect(obsoletes, "à retirer de la liste DETTE").toEqual([])
  })

  it("aucune route ne s'ouvre sans contrôle d'accès", () => {
    // Trois protections valables : le garde partagé (requireUser/requireRole),
    // un secret d'appel interne, ou la signature d'un webhook. Deux routes
    // restent publiques par nécessité — une erreur du navigateur survient
    // souvent avant toute connexion, et l'inscription à la lettre d'info n'a
    // pas de compte —, et le middleware leur impose un débit maximal.
    const PUBLIQUES: Record<string, string> = {
      "monitoring/error": "/api/monitoring/",
      "newsletter/subscribe": "/api/newsletter/",
    }
    const AUTRES_GARDES = /AGENT_SECRET|WEBHOOK_SECRET|constructEvent/

    const budgets = readFileSync("src/lib/api-rate-limit.ts", "utf8")
    const sansGarde = TOUTES.filter((r) => {
      const source = readFileSync(join(RACINE, r, "route.ts"), "utf8")
      if (/require(User|Role)\s*\(/.test(source) || AUTRES_GARDES.test(source)) return false
      const prefixe = PUBLIQUES[r]
      // Une route publique n'est tolérée que si son débit est effectivement borné.
      return !prefixe || !budgets.includes(`"${prefixe}"`)
    })
    expect(sansGarde, "routes sans contrôle d'accès ni limite de débit").toEqual([])
  })
})
