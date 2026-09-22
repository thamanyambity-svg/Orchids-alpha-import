import { describe, it, expect } from "vitest"
import { genererProFormaPdf } from "./proforma-pdf"

/** Rendu réel, sans simulation : le PDF doit se produire sans aucune ressource réseau. */
describe("genererProFormaPdf", () => {
  it("produit un PDF valide pour une pro forma complète", async () => {
    const pdf = await genererProFormaPdf({
      reference: "AIX-20260911-2496",
      version: 2,
      statut: "SUBMITTED",
      emise_le: "2026-09-22T10:00:00Z",
      valable_jusqu_au: "2026-10-22",
      client: { nom: "Client Test", societe: "Société Test", email: "client@test.cd" },
      partenaire: { societe: "MAARMALA SARL", pays: "Émirats Arabes Unis" },
      produit: "Volvo FMX 2022",
      categorie: "VEHICULE",
      transport: "SEA",
      quote: {
        currency: "USD", quantity: 1, unit_price_usd: 85000, subtotal_usd: 85000,
        freight_cost_usd: 4200, insurance_cost_usd: 600, grand_total_usd: 89800,
        incoterm: "CIF", port_loading: "Jebel Ali", port_discharge: "Matadi",
        estimated_transit_days: 35, payment_terms: "60 % à la commande, 40 % contre documents", notes: "Couleur blanche.",
      },
    })

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-")
    expect(pdf.length).toBeGreaterThan(1500)
  }, 20000)

  it("produit un PDF pour un brouillon, avec des champs absents", async () => {
    const pdf = await genererProFormaPdf({
      reference: "AIX-1", version: 1, statut: "DRAFT", emise_le: null, valable_jusqu_au: null,
      client: { nom: "—" }, partenaire: { societe: "—" }, produit: "Marchandise",
      quote: { quantity: 1, unit_price_usd: 10 },
    })
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-")
  }, 20000)
})
