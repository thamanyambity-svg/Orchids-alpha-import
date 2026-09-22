import { describe, it, expect } from "vitest"
import { REGLES, totaux, visiblePourAcheteur, dateValidite, estExpiree, formatMontant, dateFr } from "./workflow"

describe("REGLES — qui décide quoi", () => {
  it("réserve la validation et le renvoi à l'administration, sur un brouillon seulement", () => {
    expect(REGLES.approve).toMatchObject({ role: "ADMIN", depuis: ["DRAFT"], vers: "SUBMITTED", motif: false })
    expect(REGLES.return).toMatchObject({ role: "ADMIN", depuis: ["DRAFT"], vers: "REJECTED", motif: true })
  })

  it("réserve l'acceptation et la révision au client, sur une pro forma transmise", () => {
    expect(REGLES.accept).toMatchObject({ role: "BUYER", depuis: ["SUBMITTED"], vers: "ACCEPTED", motif: false })
    expect(REGLES.revise).toMatchObject({ role: "BUYER", vers: "REVISED", motif: true })
    expect(REGLES.revise.depuis).toEqual(["SUBMITTED", "EXPIRED"])
  })

  it("n'autorise jamais l'acceptation d'une pro forma expirée", () => {
    expect(REGLES.accept.depuis).not.toContain("EXPIRED")
  })
})

describe("totaux", () => {
  it("reproduit le calcul de la base, arrondi au centime", () => {
    expect(
      totaux({
        unit_price_usd: 18500.5,
        quantity: 2,
        freight_cost_usd: 2400,
        insurance_cost_usd: 185.25,
        customs_duty_estimate_usd: 0,
        inspection_cost_usd: 150,
        handling_fees_usd: 90.1,
        other_fees_usd: 0,
      })
    ).toEqual({ subtotal_usd: 37001, total_fees_usd: 2825.35, grand_total_usd: 39826.35 })
  })

  it("traite les frais absents comme nuls", () => {
    expect(totaux({ unit_price_usd: 10, quantity: 3 })).toEqual({ subtotal_usd: 30, total_fees_usd: 0, grand_total_usd: 30 })
  })
})

describe("visibilité client", () => {
  it("cache au client toute pro forma non transmise", () => {
    expect(visiblePourAcheteur({ submitted_at: null })).toBe(false)
    expect(visiblePourAcheteur({})).toBe(false)
    expect(visiblePourAcheteur({ submitted_at: "2026-09-22T10:00:00Z" })).toBe(true)
  })
})

describe("validité", () => {
  it("compte les jours à partir de la transmission", () => {
    expect(dateValidite(new Date("2026-09-22T23:30:00Z"), 30)).toBe("2026-10-22")
  })

  it("retombe sur 30 jours sans durée", () => {
    expect(dateValidite(new Date("2026-09-22T00:00:00Z"), 0)).toBe("2026-10-22")
    expect(dateValidite(new Date("2026-01-31T00:00:00Z"), NaN)).toBe("2026-03-02")
  })

  it("expire le lendemain de la date de validité, pas le jour même", () => {
    const q = { valid_until: "2026-10-22" }
    expect(estExpiree(q, new Date("2026-10-22T20:00:00Z"))).toBe(false)
    expect(estExpiree(q, new Date("2026-10-23T00:00:01Z"))).toBe(true)
    expect(estExpiree({ valid_until: null })).toBe(false)
  })
})

describe("formats", () => {
  it("formate montant et date à la française", () => {
    expect(formatMontant(39826.35).replace(/\s/g, " ")).toBe("39 826,35 USD")
    expect(dateFr("2026-10-22")).toBe("22/10/2026")
    expect(dateFr(null)).toBe("—")
  })
})
