import { describe, it, expect } from "vitest"
import { genererFactureFinalePdf } from "./final-invoice-pdf"

/** Rendu réel, sans simulation ni ressource réseau. */
describe("genererFactureFinalePdf", () => {
  it("produit un PDF valide pour une facture détaillée", async () => {
    const pdf = await genererFactureFinalePdf({
      numero: "FAC-PO-2026-0001",
      statut: "SENT",
      emise_le: "2026-09-22T10:00:00Z",
      validee_le: null,
      reference_demande: "AIX-20260911-2496",
      bon_de_commande: "PO-2026-0001",
      devise: "USD",
      pourcentage_acompte: 60,
      client: { nom: "Client Test", societe: "Société Test" },
      produit: "Volvo FMX 2022",
      lignes: [
        { libelle: "Marchandise — 1 × 85 000,00 USD", categorie: "MARCHANDISE", montant: 85000 },
        { libelle: "Fret international (CIF)", categorie: "LOGISTIQUE", montant: 4200 },
        { libelle: "Droits de douane à l'importation (DGDA)", categorie: "DOUANE", montant: 9000 },
        { libelle: "Commission Alpha Import", categorie: "COMMISSION", montant: 4000 },
      ],
      notes: "Dédouanement à Matadi.",
    })
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-")
    expect(pdf.length).toBeGreaterThan(1500)
  }, 20000)
})
