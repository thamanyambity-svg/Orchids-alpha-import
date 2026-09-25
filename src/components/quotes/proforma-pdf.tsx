import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer"
import { styles } from "@/components/documents/styles"
import {
  Entete,
  Bandeau,
  Parties,
  partieAlpha,
  Infos,
  Tableau,
  Totaux,
  Conditions,
  Banque,
  Signatures,
  Pied,
  type LigneDocument,
} from "@/components/documents/blocs"
import { CHAMPS_FRAIS, formatMontant, dateFr } from "@/lib/quotes/workflow"

/**
 * Facture pro forma, au format commercial : bandeau d'identification,
 * émetteur et client, informations logistiques, lignes chiffrées, totaux
 * avec acompte, conditions et signature.
 *
 * Produite à la demande depuis la base : elle reflète toujours la version
 * enregistrée, sans fichier à téléverser. Polices standard du format PDF,
 * aucune dépendance réseau au rendu.
 */

export interface DonneesProForma {
  reference: string
  version: number
  statut: string
  emise_le: string | null
  valable_jusqu_au: string | null
  client: { nom: string; societe?: string | null; email?: string | null; ville?: string | null }
  partenaire: { societe: string; pays?: string | null }
  produit: string
  categorie?: string | null
  transport?: string | null
  quote: Record<string, any>
}

const LIBELLES_FRAIS: Record<(typeof CHAMPS_FRAIS)[number], { ref: string; libelle: string }> = {
  freight_cost_usd: { ref: "FRT-01", libelle: "Fret international" },
  insurance_cost_usd: { ref: "ASS-01", libelle: "Assurance transport" },
  customs_duty_estimate_usd: { ref: "DOU-01", libelle: "Droits et frais au départ (estimation)" },
  inspection_cost_usd: { ref: "INS-01", libelle: "Inspection avant embarquement" },
  handling_fees_usd: { ref: "POR-01", libelle: "Manutention" },
  other_fees_usd: { ref: "DIV-01", libelle: "Autres frais du partenaire" },
}

function ProFormaDocument({ d }: { d: DonneesProForma }) {
  const q = d.quote
  const devise = q.currency ?? "USD"
  const provisoire = d.statut === "DRAFT" || d.statut === "REJECTED"
  const acompte = Number(q.grand_total_usd ?? 0) * 0.6

  const lignes: LigneDocument[] = [
    {
      reference: "MAR-01",
      designation: `${d.produit}${d.categorie ? ` — ${d.categorie}` : ""}`,
      quantite: q.quantity,
      prixUnitaire: Number(q.unit_price_usd ?? 0),
      montant: Number(q.subtotal_usd ?? 0),
    },
    ...CHAMPS_FRAIS.filter((c) => Number(q[c] ?? 0) > 0).map((c) => ({
      reference: LIBELLES_FRAIS[c].ref,
      designation: LIBELLES_FRAIS[c].libelle,
      quantite: 1,
      prixUnitaire: Number(q[c]),
      montant: Number(q[c]),
    })),
  ]

  return (
    <Document title={`Pro forma ${d.reference} v${d.version}`} author="Alpha Import Exchange">
      <Page size="A4" style={styles.page}>
        <Entete titre="Facture pro forma" titreAnglais="Pro forma invoice" />

        <Bandeau
          champs={[
            { etiquette: "N° / No.", valeur: `${d.reference}-PF${String(d.version).padStart(2, "0")}` },
            { etiquette: "Date", valeur: dateFr(d.emise_le) },
            { etiquette: "Validité / Valid until", valeur: dateFr(d.valable_jusqu_au) },
            { etiquette: "Devise / Currency", valeur: devise },
          ]}
        />

        {provisoire && (
          <Text style={styles.bandeauAlerte}>
            DOCUMENT PROVISOIRE — en cours de vérification par Alpha Import, non transmis au client, sans valeur d&apos;engagement.
          </Text>
        )}

        <Parties
          gauche={partieAlpha()}
          droite={{
            titre: "Client / Bill to",
            nom: d.client.societe || d.client.nom,
            lignes: [d.client.societe ? d.client.nom : null, d.client.ville, d.client.email],
          }}
        />

        <Infos
          champs={[
            { etiquette: "Incoterms® 2020", valeur: q.incoterm },
            { etiquette: "Mode", valeur: d.transport === "AIR" ? "Aérien" : d.transport === "SEA" ? "Maritime" : null },
            { etiquette: "Partenaire sur place", valeur: [d.partenaire.societe, d.partenaire.pays].filter(Boolean).join(" · ") },
            { etiquette: "Port d'embarquement", valeur: q.port_loading },
            { etiquette: "Port de débarquement", valeur: q.port_discharge },
            { etiquette: "Transit estimé", valeur: q.estimated_transit_days ? `${q.estimated_transit_days} jours` : null },
            { etiquette: "Départ estimé", valeur: q.estimated_departure_date ? dateFr(q.estimated_departure_date) : null },
            { etiquette: "Arrivée estimée", valeur: q.estimated_arrival_date ? dateFr(q.estimated_arrival_date) : null },
            { etiquette: "Quantité", valeur: q.quantity ? String(q.quantity) : null },
          ]}
        />

        <Tableau lignes={lignes} devise={devise} />

        <View style={styles.bas}>
          <Conditions
            elements={[
              { titre: "Conditions de paiement :", texte: q.payment_terms || "" },
              { titre: "Notes :", texte: q.notes || "" },
              {
                titre: "Portée :",
                texte:
                  "Document sans valeur comptable, établi pour validation de commande. Les droits et taxes d'importation en RDC, le transport jusqu'à destination finale et la commission Alpha Import figurent sur la facture finale, émise avant tout paiement.",
              },
            ]}
          />
          <Totaux
            lignes={[
              { libelle: "Sous-total marchandise", montant: Number(q.subtotal_usd ?? 0) },
              { libelle: "Frais et transport", montant: Number(q.total_fees_usd ?? 0) },
              { libelle: `Total ${q.incoterm ?? ""}`.trim(), montant: Number(q.grand_total_usd ?? 0), ton: "fort" },
              { libelle: "Acompte indicatif (60 %)", montant: acompte, ton: "or" },
            ]}
            devise={devise}
          />
        </View>

        <Banque titre="Coordonnées bancaires / Bank details" />

        <Signatures
          blocs={[
            { titre: "Partenaire agréé", sous: d.partenaire.societe },
            { titre: "Cachet et signature de l'émetteur", sous: "Service commercial — Alpha Import Exchange" },
          ]}
        />

        <Pied reference={`${d.reference} · Pro forma v${d.version} · ${formatMontant(q.grand_total_usd, devise)}`} />
      </Page>
    </Document>
  )
}

export async function genererProFormaPdf(d: DonneesProForma): Promise<Buffer> {
  return renderToBuffer(<ProFormaDocument d={d} />)
}
