import { describe, it, expect } from "vitest"
import { lignesDepuisProForma, totauxFacture, numeroFacture, motifRefusLignes, type LigneFacture } from "./final"

const proForma = {
  currency: "USD", quantity: 1, unit_price_usd: 85000, subtotal_usd: 85000,
  freight_cost_usd: 4200, insurance_cost_usd: 600, inspection_cost_usd: 0,
  handling_fees_usd: 150, customs_duty_estimate_usd: 0, other_fees_usd: 0, incoterm: "CIF",
}

describe("lignesDepuisProForma", () => {
  it("reprend la marchandise et les seuls frais non nuls de la pro forma", () => {
    const lignes = lignesDepuisProForma(proForma)
    const reprises = lignes.filter((l) => l.montant > 0)
    expect(reprises).toEqual([
      expect.objectContaining({ categorie: "MARCHANDISE", montant: 85000 }),
      expect.objectContaining({ libelle: "Fret international (CIF)", categorie: "LOGISTIQUE", montant: 4200 }),
      expect.objectContaining({ libelle: "Assurance transport", montant: 600 }),
      expect.objectContaining({ libelle: "Manutention", montant: 150 }),
    ])
  })

  it("ajoute à zéro les postes qu'Alpha Import doit chiffrer, sans inventer de taux", () => {
    const aCompleter = lignesDepuisProForma(proForma).filter((l) => l.montant === 0)
    expect(aCompleter.map((l) => l.categorie)).toEqual(["DOUANE", "DOUANE", "DOUANE", "LOGISTIQUE", "COMMISSION"])
  })
})

describe("totauxFacture", () => {
  const lignes: LigneFacture[] = [
    { libelle: "Marchandise", categorie: "MARCHANDISE", montant: 85000 },
    { libelle: "Fret", categorie: "LOGISTIQUE", montant: 4200 },
    { libelle: "DGDA", categorie: "DOUANE", montant: 9350.5 },
    { libelle: "TVA", categorie: "DOUANE", montant: 15693.4 },
    { libelle: "Commission", categorie: "COMMISSION", montant: 4250 },
  ]

  it("totalise, isole la commission et répartit 60 / 40 au centime", () => {
    const t = totauxFacture(lignes)
    expect(t.total).toBe(118493.9)
    expect(t.commission).toBe(4250)
    expect(t.acompte).toBe(71096.34)
    expect(t.solde).toBe(47397.56)
    expect(t.acompte + t.solde).toBeCloseTo(t.total, 2)
    expect(t.parCategorie.DOUANE).toBe(25043.9)
  })

  it("suit le pourcentage d'acompte du bon de commande", () => {
    expect(totauxFacture([{ libelle: "M", categorie: "MARCHANDISE", montant: 1000 }], 50).acompte).toBe(500)
  })
})

describe("motifRefusLignes", () => {
  it("exige la marchandise et un total positif", () => {
    expect(motifRefusLignes([])).toMatch(/aucune ligne/)
    expect(motifRefusLignes([{ libelle: "Fret", categorie: "LOGISTIQUE", montant: 10 }])).toMatch(/marchandise/)
    expect(motifRefusLignes([{ libelle: "M", categorie: "MARCHANDISE", montant: 10 }])).toBeNull()
  })
})

it("numérote la facture d'après le bon de commande", () => {
  expect(numeroFacture("PO-2026-0001")).toBe("FAC-PO-2026-0001")
})
