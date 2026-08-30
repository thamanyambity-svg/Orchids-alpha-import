import { describe, it, expect } from "vitest"
import {
  REQUEST_STATUS,
  QUOTE_STATUS,
  PURCHASE_ORDER_STATUS,
  INVOICE_STATUS,
  PAYMENT_PROOF_STATUS,
  statusBadge,
  statusLabel,
  statusMeta,
} from "@/lib/design/status"
import { tone } from "@/lib/design/tone"

const REGISTRIES = {
  REQUEST_STATUS,
  QUOTE_STATUS,
  PURCHASE_ORDER_STATUS,
  INVOICE_STATUS,
  PAYMENT_PROOF_STATUS,
}

describe("registre des statuts", () => {
  it("donne à chaque statut un libellé non vide et une tonalité connue", () => {
    const tones = ["neutral", "brand", "info", "success", "warning", "danger"]
    for (const [name, registry] of Object.entries(REGISTRIES)) {
      for (const [code, meta] of Object.entries(registry.entries)) {
        expect(meta.label.trim(), `${name}.${code}`).not.toBe("")
        expect(tones, `${name}.${code}`).toContain(meta.tone)
      }
    }
  })

  it("n'écrit aucune couleur en dur : les classes viennent des jetons", () => {
    // Une couleur Tailwind brute (green-700, amber-500…) ou un hex arbitraire
    // trahirait un contournement du thème.
    const brut = /-(slate|gray|zinc|red|orange|amber|yellow|green|emerald|blue|sky|indigo|purple|pink)-\d{2,3}|\[#[0-9a-f]{3,8}\]/i
    for (const registry of Object.values(REGISTRIES)) {
      for (const code of Object.keys(registry.entries)) {
        expect(statusBadge(registry, code)).not.toMatch(brut)
      }
    }
  })

  it("retombe sur une tonalité neutre pour un statut inconnu au lieu d'une classe vide", () => {
    expect(statusBadge(REQUEST_STATUS, "STATUT_INEXISTANT")).toBe(tone("neutral").badge)
    expect(statusBadge(REQUEST_STATUS, null)).toBe(tone("neutral").badge)
    expect(statusBadge(REQUEST_STATUS, undefined)).toBe(tone("neutral").badge)
  })

  it("conserve le code du statut comme libellé de repli plutôt que de l'effacer", () => {
    expect(statusLabel(REQUEST_STATUS, "STATUT_INEXISTANT")).toBe("STATUT_INEXISTANT")
    expect(statusLabel(REQUEST_STATUS, null)).toBe("Inconnu")
  })

  it("couvre les statuts qui avaient perdu leur style : FROZEN et CANCELLED", () => {
    for (const code of ["FROZEN", "CANCELLED"]) {
      expect(REQUEST_STATUS.entries[code]).toBeDefined()
      expect(statusBadge(REQUEST_STATUS, code)).not.toBe("")
    }
  })

  it("applique la convention de tonalité aux étapes qui attendent une action", () => {
    for (const code of ["AWAITING_DEPOSIT", "AWAITING_BALANCE"]) {
      expect(statusMeta(REQUEST_STATUS, code).tone).toBe("warning")
    }
    expect(statusMeta(PURCHASE_ORDER_STATUS, "PENDING_SIGNATURE").tone).toBe("warning")
    expect(statusMeta(PAYMENT_PROOF_STATUS, "PENDING_REVIEW").tone).toBe("warning")
  })

  it("applique la tonalité d'échec aux issues négatives", () => {
    expect(statusMeta(REQUEST_STATUS, "INCIDENT").tone).toBe("danger")
    expect(statusMeta(REQUEST_STATUS, "REJECTED").tone).toBe("danger")
    expect(statusMeta(INVOICE_STATUS, "OVERDUE").tone).toBe("danger")
    expect(statusMeta(QUOTE_STATUS, "REJECTED").tone).toBe("danger")
  })

  it("donne un seul libellé par statut partagé entre les espaces", () => {
    // Le défaut corrigé : CLOSED se lisait « Fermé » côté acheteur et
    // « Terminé » côté partenaire, VALIDATED « Validé » puis « À traiter ».
    expect(statusLabel(REQUEST_STATUS, "CLOSED")).toBe("Clôturé")
    expect(statusLabel(REQUEST_STATUS, "VALIDATED")).toBe("Validé")
  })
})
