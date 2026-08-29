import { describe, it, expect } from "vitest"
import { verifyTransitionAllowed, normalizeCustomsActorRole } from "./transition-matrix"
import { isCustomsFileStatus } from "./status-display"
import type { CustomsFileStatus } from "./types"

const ALL_STATUSES: CustomsFileStatus[] = [
  "DRAFT",
  "PRE_ADVICE",
  "IN_CUSTOMS",
  "LIQUIDATED",
  "PAID",
  "RELEASED",
  "BLOCKED",
]

describe("normalizeCustomsActorRole", () => {
  it("fait correspondre le rôle applicatif PARTNER à l'acteur douanier", () => {
    expect(normalizeCustomsActorRole("PARTNER")).toBe("PARTNER_COUNTRY")
  })

  it("laisse les autres rôles inchangés", () => {
    expect(normalizeCustomsActorRole("ADMIN")).toBe("ADMIN")
    expect(normalizeCustomsActorRole("ACCOUNTANT")).toBe("ACCOUNTANT")
  })
})

describe("verifyTransitionAllowed", () => {
  it("suit la progression nominale du dossier pour un admin", () => {
    const chain: [CustomsFileStatus, CustomsFileStatus][] = [
      ["DRAFT", "PRE_ADVICE"],
      ["PRE_ADVICE", "IN_CUSTOMS"],
      ["IN_CUSTOMS", "LIQUIDATED"],
      ["LIQUIDATED", "PAID"],
      ["PAID", "RELEASED"],
    ]

    for (const [from, to] of chain) {
      expect(verifyTransitionAllowed(from, to, "ADMIN").allowed).toBe(true)
    }
  })

  it("interdit de sauter une étape", () => {
    expect(verifyTransitionAllowed("DRAFT", "RELEASED", "ADMIN").allowed).toBe(false)
    expect(verifyTransitionAllowed("PRE_ADVICE", "PAID", "ADMIN").allowed).toBe(false)
  })

  it("fige un dossier libéré, quel que soit le rôle", () => {
    for (const role of ["ADMIN", "PARTNER", "FISCAL_CONSULTANT", "ACCOUNTANT"]) {
      for (const target of ALL_STATUSES) {
        expect(verifyTransitionAllowed("RELEASED", target, role).allowed).toBe(false)
      }
    }
  })

  it("refuse une transition vers le statut déjà en cours", () => {
    const result = verifyTransitionAllowed("IN_CUSTOMS", "IN_CUSTOMS", "ADMIN")
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain("déjà en statut")
  })

  it("empêche le partenaire de bloquer ou de libérer un dossier", () => {
    expect(verifyTransitionAllowed("IN_CUSTOMS", "BLOCKED", "PARTNER").allowed).toBe(false)
    expect(verifyTransitionAllowed("PAID", "RELEASED", "PARTNER").allowed).toBe(false)
  })

  it("laisse le partenaire faire avancer le dossier jusqu'au paiement", () => {
    expect(verifyTransitionAllowed("DRAFT", "PRE_ADVICE", "PARTNER").allowed).toBe(true)
    expect(verifyTransitionAllowed("LIQUIDATED", "PAID", "PARTNER").allowed).toBe(true)
  })

  it("réserve le déblocage à l'admin et au consultant fiscal", () => {
    expect(verifyTransitionAllowed("BLOCKED", "IN_CUSTOMS", "ADMIN").allowed).toBe(true)
    expect(verifyTransitionAllowed("BLOCKED", "IN_CUSTOMS", "FISCAL_CONSULTANT").allowed).toBe(true)
    expect(verifyTransitionAllowed("BLOCKED", "IN_CUSTOMS", "PARTNER").allowed).toBe(false)
  })

  it("écarte le comptable de toute transition de statut, avec un motif explicite", () => {
    const result = verifyTransitionAllowed("DRAFT", "PRE_ADVICE", "ACCOUNTANT")
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain("Comptable")
  })

  it("refuse un rôle inconnu au lieu de le laisser passer", () => {
    expect(verifyTransitionAllowed("DRAFT", "PRE_ADVICE", "MARKETING").allowed).toBe(false)
  })
})

describe("isCustomsFileStatus", () => {
  it("reconnaît exactement les statuts de la contrainte en base", () => {
    for (const status of ALL_STATUSES) {
      expect(isCustomsFileStatus(status)).toBe(true)
    }
    expect(isCustomsFileStatus("SHIPPED")).toBe(false)
    expect(isCustomsFileStatus("")).toBe(false)
  })
})
