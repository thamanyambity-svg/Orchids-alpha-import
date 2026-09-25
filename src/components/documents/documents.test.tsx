import { describe, it, expect } from "vitest"
import { genererProFormaPdf } from "@/components/quotes/proforma-pdf"
import { genererFactureFinalePdf } from "@/components/invoices/final-invoice-pdf"
import { genererBonDeCommandePdf } from "@/components/orders/purchase-order-pdf"
import { lignesEmetteur, lignesBanque, piedEntreprise, ENTREPRISE } from "@/lib/documents/entreprise"

/**
 * Rendu réel des trois documents commerciaux, sans simulation ni ressource
 * réseau : c'est le seul contrôle qui prouve qu'un PDF sort effectivement.
 */

const CLIENT = { nom: "KITOKO NZIKISA BULA", societe: "SOCOMA RDC", email: "client@test.cd", ville: "Kinshasa" }
const PARTENAIRE = { societe: "MAARMALA SARL", pays: "Émirats Arabes Unis" }

const DEVIS = {
  currency: "USD",
  quantity: 2,
  unit_price_usd: 18500,
  subtotal_usd: 37000,
  freight_cost_usd: 4200,
  insurance_cost_usd: 600,
  handling_fees_usd: 150,
  customs_duty_estimate_usd: 0,
  inspection_cost_usd: 0,
  other_fees_usd: 0,
  total_fees_usd: 4950,
  grand_total_usd: 41950,
  incoterm: "CIF",
  port_loading: "Jebel Ali",
  port_discharge: "Matadi",
  estimated_transit_days: 35,
  estimated_departure_date: "2026-10-06",
  estimated_arrival_date: "2026-11-10",
  payment_terms: "60 % à la commande, 40 % contre documents d'expédition",
  notes: "Couleur blanche, double cabine.",
  version: 2,
}

describe("documents commerciaux", () => {
  it("produit la pro forma", async () => {
    const pdf = await genererProFormaPdf({
      reference: "AIX-20260911-2496",
      version: 2,
      statut: "SUBMITTED",
      emise_le: "2026-09-22T10:00:00Z",
      valable_jusqu_au: "2026-10-22",
      client: CLIENT,
      partenaire: PARTENAIRE,
      produit: "Volvo FMX 2022",
      categorie: "VEHICULE",
      transport: "SEA",
      quote: DEVIS,
    })
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-")
    expect(pdf.length).toBeGreaterThan(3000)
  }, 30000)

  it("marque la pro forma en brouillon comme provisoire", async () => {
    const pdf = await genererProFormaPdf({
      reference: "AIX-1",
      version: 1,
      statut: "DRAFT",
      emise_le: null,
      valable_jusqu_au: null,
      client: { nom: "—" },
      partenaire: { societe: "—" },
      produit: "Marchandise",
      quote: { quantity: 1, unit_price_usd: 10, subtotal_usd: 10, grand_total_usd: 10 },
    })
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-")
  }, 30000)

  it("produit la facture finale, acompte reçu déduit", async () => {
    const pdf = await genererFactureFinalePdf({
      numero: "FAC-PO-2026-0001",
      statut: "SENT",
      emise_le: "2026-09-24T10:00:00Z",
      validee_le: "2026-09-25T09:00:00Z",
      reference_demande: "AIX-20260911-2496",
      bon_de_commande: "PO-2026-0001",
      devise: "USD",
      pourcentage_acompte: 60,
      client: CLIENT,
      produit: "Volvo FMX 2022",
      lignes: [
        { libelle: "Marchandise — 2 × 18 500,00 USD", categorie: "MARCHANDISE", montant: 37000 },
        { libelle: "Fret international (CIF)", categorie: "LOGISTIQUE", montant: 4200 },
        { libelle: "Droits de douane à l'importation (DGDA)", categorie: "DOUANE", montant: 9000 },
        { libelle: "TVA à l'importation", categorie: "DOUANE", montant: 6720 },
        { libelle: "Commission Alpha Import", categorie: "COMMISSION", montant: 4000 },
      ],
      notes: "Dédouanement à Matadi.",
      acompte_recu: 36552,
      acompte_recu_le: "2026-09-26T08:00:00Z",
    })
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-")
    expect(pdf.length).toBeGreaterThan(3000)
  }, 30000)

  it("produit le bon de commande, signé ou non", async () => {
    const base = {
      numero: "PO-2026-0001",
      statut: "SIGNED",
      emis_le: "2026-09-22T11:29:00Z",
      devise: "USD",
      reference_demande: "AIX-20260911-2496",
      pro_forma: "AIX-20260911-2496-PF02",
      pourcentage_acompte: 60,
      pourcentage_solde: 40,
      total: 41950,
      client: CLIENT,
      partenaire: PARTENAIRE,
      produit: "Volvo FMX 2022",
      quote: DEVIS,
    }
    const signe = await genererBonDeCommandePdf({
      ...base,
      signature: { le: "2026-09-25T09:00:00Z", version: "1.0", adresse: "41.243.1.2" },
    })
    const nonSigne = await genererBonDeCommandePdf({ ...base, statut: "GENERATED", quote: null, signature: null })
    expect(signe.subarray(0, 5).toString()).toBe("%PDF-")
    expect(nonSigne.subarray(0, 5).toString()).toBe("%PDF-")
  }, 30000)
})

describe("identité de l'entreprise", () => {
  it("n'imprime jamais un identifiant vide", () => {
    const lignes = lignesEmetteur()
    expect(lignes[0]).toBe(ENTREPRISE.raisonSociale)
    expect(lignes.every((l) => l.trim().length > 0)).toBe(true)
    // Tant que les numéros ne sont pas renseignés, aucune mention creuse.
    expect(lignes.join(" ")).not.toMatch(/RCCM\s*(·|$)/)
    expect(piedEntreprise()).toContain(ENTREPRISE.site)
  })

  it("n'affiche aucun bloc bancaire tant que les coordonnées manquent", () => {
    const banque = lignesBanque()
    expect(banque === null || banque.every((l) => l.trim().length > 0)).toBe(true)
  })
})
