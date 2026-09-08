import { describe, it, expect } from "vitest"
import {
  REQUEST_STATUS,
  QUOTE_STATUS,
  PURCHASE_ORDER_STATUS,
  INVOICE_STATUS,
  PAYMENT_PROOF_STATUS,
  statusKey,
  statusLabel,
  type StatusRegistry,
} from "@/lib/design/status"
import fr from "@/lib/locales/fr"
import en from "@/lib/locales/en"
import ar from "@/lib/locales/ar"
import tr from "@/lib/locales/tr"
import zh from "@/lib/locales/zh"
import ja from "@/lib/locales/ja"

const REGISTRIES: StatusRegistry[] = [
  REQUEST_STATUS,
  QUOTE_STATUS,
  PURCHASE_ORDER_STATUS,
  INVOICE_STATUS,
  PAYMENT_PROOF_STATUS,
]

const LOCALES: Record<string, Record<string, string>> = { fr, en, ar, tr, zh, ja }

describe("traduction des statuts", () => {
  it("couvre chaque statut dans les six langues", () => {
    const manquants: string[] = []
    for (const registry of REGISTRIES) {
      for (const code of Object.keys(registry.entries)) {
        const key = statusKey(registry, code)
        for (const [lang, dict] of Object.entries(LOCALES)) {
          if (!dict[key]) manquants.push(`${lang} → ${key}`)
        }
      }
    }
    expect(manquants).toEqual([])
  })

  it("ne laisse aucune traduction vide", () => {
    const vides: string[] = []
    for (const registry of REGISTRIES) {
      for (const code of Object.keys(registry.entries)) {
        const key = statusKey(registry, code)
        for (const [lang, dict] of Object.entries(LOCALES)) {
          if (dict[key] !== undefined && dict[key].trim() === "") vides.push(`${lang} → ${key}`)
        }
      }
    }
    expect(vides).toEqual([])
  })

  it("bâtit une clef unique par famille et par statut", () => {
    const vues = new Set<string>()
    for (const registry of REGISTRIES) {
      for (const code of Object.keys(registry.entries)) {
        const key = statusKey(registry, code)
        expect(vues.has(key), `clef dupliquée : ${key}`).toBe(false)
        vues.add(key)
      }
    }
    expect(vues.size).toBe(38)
  })

  it("traduit quand un traducteur est fourni et retombe sur le français sinon", () => {
    const t = (key: string, repli?: string) => en[key] ?? repli ?? key
    expect(statusLabel(REQUEST_STATUS, "SHIPPED")).toBe("Expédié")
    expect(statusLabel(REQUEST_STATUS, "SHIPPED", t)).toBe("Shipped")
  })

  it("laisse le repli agir pour un statut hors registre", () => {
    const t = (key: string, repli?: string) => en[key] ?? repli ?? key
    expect(statusLabel(REQUEST_STATUS, "STATUT_INEXISTANT", t)).toBe("STATUT_INEXISTANT")
  })
})
