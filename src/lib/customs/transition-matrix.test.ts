import { describe, it, expect } from "vitest"
import { verifyTransitionAllowed, normalizeCustomsActorRole, allowedNextStatuses } from "./transition-matrix"
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

describe('allowedNextStatuses — ce que l\'interface a le droit de proposer', () => {
  it('propose à un administrateur les suites de la matrice, blocage compris', () => {
    expect(allowedNextStatuses('DRAFT', 'ADMIN').sort()).toEqual(['BLOCKED', 'PRE_ADVICE'])
    expect(allowedNextStatuses('IN_CUSTOMS', 'ADMIN').sort()).toEqual(['BLOCKED', 'LIQUIDATED'])
  })

  it('ne propose aucune suite depuis un dossier libéré', () => {
    expect(allowedNextStatuses('RELEASED', 'ADMIN')).toEqual([])
    expect(allowedNextStatuses('RELEASED', 'PARTNER')).toEqual([])
  })

  it('restreint le partenaire à la marche avant, sans blocage', () => {
    expect(allowedNextStatuses('DRAFT', 'PARTNER')).toEqual(['PRE_ADVICE'])
    expect(allowedNextStatuses('PAID', 'PARTNER')).toEqual([])
    for (const depuis of ['DRAFT', 'PRE_ADVICE', 'IN_CUSTOMS', 'LIQUIDATED'] as const) {
      expect(allowedNextStatuses(depuis, 'PARTNER')).not.toContain('BLOCKED')
    }
  })

  it('ne propose rien au comptable, qui ne touche pas au statut douanier', () => {
    for (const depuis of ['DRAFT', 'IN_CUSTOMS', 'PAID'] as const) {
      expect(allowedNextStatuses(depuis, 'ACCOUNTANT')).toEqual([])
    }
  })

  it('ne propose jamais une transition que le serveur refuserait', () => {
    // Le garde-fou qui compte : tout ce que l'interface offre doit passer la
    // vérification serveur. Sinon l'utilisateur voit un bouton qui échoue.
    const statuts = ['DRAFT', 'PRE_ADVICE', 'IN_CUSTOMS', 'LIQUIDATED', 'PAID', 'RELEASED', 'BLOCKED'] as const
    for (const role of ['ADMIN', 'PARTNER', 'PARTNER_COUNTRY', 'FISCAL_CONSULTANT', 'ACCOUNTANT']) {
      for (const depuis of statuts) {
        for (const vers of allowedNextStatuses(depuis, role)) {
          const verdict = verifyTransitionAllowed(depuis, vers, role)
          expect(verdict.allowed, `${role} : ${depuis} → ${vers}`).toBe(true)
        }
      }
    }
  })

  it('rend un rôle inconnu totalement inerte', () => {
    expect(allowedNextStatuses('DRAFT', 'INTRUS')).toEqual([])
  })
})
