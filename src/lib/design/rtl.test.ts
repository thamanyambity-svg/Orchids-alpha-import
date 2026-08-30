import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

/**
 * L'arabe est l'une des six langues du produit et le document passe en
 * dir="rtl". Les utilitaires directionnels physiques ne se retournent pas :
 * une marge à gauche reste à gauche, un texte aligné à droite reste à droite.
 * Leurs équivalents logiques suivent la direction du document.
 *
 * Ce test échoue si l'un d'eux réapparaît, pour éviter que la mise en page
 * arabe ne se dégrade silencieusement au fil des contributions.
 */

const RACINE = join(process.cwd(), "src")

// Positionnement absolu : left-* et right-* servent souvent au centrage
// (left-1/2 combiné à -translate-x-1/2), où la version logique se comporte
// différemment. Ils demandent un examen au cas par cas, pas une règle.
const INTERDITS = [
  { motif: /(?<![\w-])ml-(?:auto|px|\d)/g, nom: "ml-*", remplacer: "ms-*" },
  { motif: /(?<![\w-])mr-(?:auto|px|\d)/g, nom: "mr-*", remplacer: "me-*" },
  { motif: /(?<![\w-])pl-(?:px|\d)/g, nom: "pl-*", remplacer: "ps-*" },
  { motif: /(?<![\w-])pr-(?:px|\d)/g, nom: "pr-*", remplacer: "pe-*" },
  { motif: /(?<![\w-])text-left(?![\w-])/g, nom: "text-left", remplacer: "text-start" },
  { motif: /(?<![\w-])text-right(?![\w-])/g, nom: "text-right", remplacer: "text-end" },
  { motif: /(?<![\w-])rounded-l-/g, nom: "rounded-l-*", remplacer: "rounded-s-*" },
  { motif: /(?<![\w-])rounded-r-/g, nom: "rounded-r-*", remplacer: "rounded-e-*" },
]

// Exceptions assumées, chacune pour une raison précise.
const EXCEPTIONS = [
  // Marge négative décorative accordée à un positionnement physique voisin
  // (absolute top-0 right-0) : la rendre logique la désaccorderait.
  "src/components/ai-assistant.tsx",
  // Carrousel shadcn : gère lui-même sa direction via embla.
  "src/components/ui/carousel.tsx",
]

function fichiersSource(dossier: string, acc: string[] = []): string[] {
  for (const entree of readdirSync(dossier)) {
    const chemin = join(dossier, entree)
    if (statSync(chemin).isDirectory()) {
      if (entree !== "node_modules") fichiersSource(chemin, acc)
    } else if (/\.tsx?$/.test(entree) && !/\.test\.tsx?$/.test(entree)) {
      acc.push(chemin)
    }
  }
  return acc
}

describe("mise en page bidirectionnelle", () => {
  it("n'utilise aucun utilitaire directionnel physique", () => {
    const infractions: string[] = []
    for (const chemin of fichiersSource(RACINE)) {
      const relatif = chemin.slice(process.cwd().length + 1)
      if (EXCEPTIONS.includes(relatif)) continue
      const contenu = readFileSync(chemin, "utf-8")
      for (const { motif, nom, remplacer } of INTERDITS) {
        const trouve = contenu.match(motif)
        if (trouve) infractions.push(`${relatif} : ${trouve.length}× ${nom} → utiliser ${remplacer}`)
      }
    }
    expect(infractions).toEqual([])
  })

  it("ne découpe un titre en caractères qu'avec une direction déduite", () => {
    // Découper un mot en blocs par caractère inverse son ordre sous dir="rtl" :
    // « L'AFRIQUE » s'affichait « EUQIRFA'L » en arabe. dir="auto" laisse le
    // navigateur ordonner selon l'écriture du mot lui-même.
    for (const chemin of fichiersSource(RACINE)) {
      const contenu = readFileSync(chemin, "utf-8")
      const index = contenu.indexOf('.split("").map')
      if (index === -1) continue
      // On ne contraint que le découpage rendu en blocs alignés.
      const extrait = contenu.slice(Math.max(0, index - 400), index + 400)
      if (!extrait.includes("inline-block")) continue
      expect(extrait, chemin).toContain('dir="auto"')
    }
  })
})
