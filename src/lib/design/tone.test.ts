import { describe, it, expect } from "vitest"
import { tone, toneBadge, toneSurface, type Tone } from "@/lib/design/tone"

const TONES: Tone[] = ["neutral", "brand", "info", "success", "warning", "danger"]

describe("tonalités du système de design", () => {
  it("expose les six variantes pour chaque tonalité", () => {
    for (const t of TONES) {
      const c = tone(t)
      for (const variante of ["badge", "surface", "text", "icon", "border", "dot"] as const) {
        expect(c[variante], `${t}.${variante}`).toBeTruthy()
      }
    }
  })

  it("n'écrit aucune couleur Tailwind brute ni hex arbitraire", () => {
    const brut = /-(slate|gray|zinc|red|orange|amber|yellow|green|emerald|blue|sky|indigo|purple|pink)-\d{2,3}|\[#[0-9a-f]{3,8}\]|\bwhite\b|\bblack\b/i
    for (const t of TONES) {
      for (const valeur of Object.values(tone(t))) {
        expect(valeur, t).not.toMatch(brut)
      }
    }
  })

  it("donne à chaque tonalité un jeu de classes distinct", () => {
    const pastilles = TONES.map(toneBadge)
    expect(new Set(pastilles).size).toBe(TONES.length)
  })

  it("les raccourcis renvoient les mêmes classes que l'objet complet", () => {
    for (const t of TONES) {
      expect(toneBadge(t)).toBe(tone(t).badge)
      expect(toneSurface(t)).toBe(tone(t).surface)
    }
  })
})
