import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"

/**
 * Changement de session : toujours un chargement complet de page.
 *
 * Les liens vers les espaces sont préchargés. Préchargés sans session, ils
 * gardent la réponse « redirection vers la connexion » ; préchargés avec
 * session, /login garde « redirection vers l'espace ». Après une connexion ou
 * une déconnexion, `router.push` réutilisait ces réponses sans interroger le
 * serveur : « Connexion réussie » s'affichait et l'espace client ne s'ouvrait
 * pas avant un rechargement manuel.
 */

const FICHIERS = [
  "src/app/login/page.tsx",
  "src/components/dashboard/sidebar.tsx",
  "src/components/partner/sidebar.tsx",
  "src/components/admin/sidebar.tsx",
]

const NAVIGATION_ROUTEUR = /router\.(push|replace)\(\s*["'`]\/(admin|partner|dashboard|login)/

describe("navigation après connexion ou déconnexion", () => {
  it.each(FICHIERS)("%s n'ouvre ni espace ni /login par le routeur", (fichier) => {
    expect(readFileSync(fichier, "utf8")).not.toMatch(NAVIGATION_ROUTEUR)
  })

  it("la connexion ouvre l'espace par un chargement complet", () => {
    expect(readFileSync("src/app/login/page.tsx", "utf8")).toMatch(/window\.location\.assign\(/)
  })

  it.each(FICHIERS.slice(1))("%s se déconnecte par un chargement complet", (fichier) => {
    const source = readFileSync(fichier, "utf8")
    expect(source).toMatch(/signOut\(\)/)
    expect(source).toMatch(/window\.location\.href\s*=\s*["']\/login["']/)
  })
})
