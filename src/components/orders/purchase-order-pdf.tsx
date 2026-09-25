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
  Signatures,
  Pied,
  type LigneDocument,
} from "@/components/documents/blocs"
import { CHAMPS_FRAIS, formatMontant, dateFr } from "@/lib/quotes/workflow"

/**
 * Bon de commande : l'engagement du client sur la pro forma qu'il a acceptée.
 *
 * Il n'existait qu'en base, sans document imprimable — la carte du dossier
 * proposait un lien vers un PDF qui n'a jamais été produit. Il porte
 * désormais les mêmes blocs que la pro forma et la facture, et la trace de
 * l'acceptation des conditions générales : date, adresse et navigateur.
 */

export interface DonneesBonDeCommande {
  numero: string
  statut: string
  emis_le: string | null
  devise: string
  reference_demande: string
  pro_forma: string | null
  pourcentage_acompte: number
  pourcentage_solde: number
  total: number
  client: { nom: string; societe?: string | null; email?: string | null; ville?: string | null }
  partenaire: { societe: string; pays?: string | null }
  produit: string
  quote: Record<string, any> | null
  signature?: { le: string | null; version: string | null; adresse?: string | null } | null
}

const LIBELLES_FRAIS: Record<(typeof CHAMPS_FRAIS)[number], string> = {
  freight_cost_usd: "Fret international",
  insurance_cost_usd: "Assurance transport",
  customs_duty_estimate_usd: "Droits et frais au départ (estimation)",
  inspection_cost_usd: "Inspection avant embarquement",
  handling_fees_usd: "Manutention",
  other_fees_usd: "Autres frais du partenaire",
}

const ETATS: Record<string, string> = {
  GENERATED: "En attente de la facture finale",
  PENDING_SIGNATURE: "En attente de signature",
  SIGNED: "Signé par le client",
  CONFIRMED: "Confirmé",
  CANCELLED: "Annulé",
  EXPIRED: "Expiré",
}

function BonDeCommandeDocument({ d }: { d: DonneesBonDeCommande }) {
  const q = d.quote ?? {}
  const acompte = Math.round(d.total * d.pourcentage_acompte) / 100
  const solde = Math.round((d.total - acompte) * 100) / 100

  const lignes: LigneDocument[] = q.unit_price_usd
    ? [
        {
          reference: "010",
          designation: d.produit,
          quantite: q.quantity,
          prixUnitaire: Number(q.unit_price_usd ?? 0),
          montant: Number(q.subtotal_usd ?? 0),
        },
        ...CHAMPS_FRAIS.filter((c) => Number(q[c] ?? 0) > 0).map((c, i) => ({
          reference: String((i + 2) * 10).padStart(3, "0"),
          designation: LIBELLES_FRAIS[c],
          quantite: 1,
          prixUnitaire: Number(q[c]),
          montant: Number(q[c]),
        })),
      ]
    : [{ reference: "010", designation: d.produit, quantite: 1, prixUnitaire: d.total, montant: d.total }]

  return (
    <Document title={`Bon de commande ${d.numero}`} author="Alpha Import Exchange">
      <Page size="A4" style={styles.page}>
        <Entete titre="Bon de commande" titreAnglais="Purchase order" />

        <Bandeau
          champs={[
            { etiquette: "N° / PO No.", valeur: d.numero },
            { etiquette: "Date", valeur: dateFr(d.emis_le) },
            { etiquette: "Réf. pro forma", valeur: d.pro_forma },
            { etiquette: "Devise / Currency", valeur: d.devise },
          ]}
        />

        <Parties
          gauche={{
            titre: "Client / Buyer",
            nom: d.client.societe || d.client.nom,
            lignes: [d.client.societe ? d.client.nom : null, d.client.ville, d.client.email],
          }}
          droite={partieAlpha("Intermédiaire / Issued by")}
        />

        <Infos
          champs={[
            { etiquette: "Demande", valeur: d.reference_demande },
            { etiquette: "État", valeur: ETATS[d.statut] ?? d.statut },
            { etiquette: "Partenaire sur place", valeur: [d.partenaire.societe, d.partenaire.pays].filter(Boolean).join(" · ") },
            { etiquette: "Incoterms® 2020", valeur: q.incoterm },
            { etiquette: "Port d'embarquement", valeur: q.port_loading },
            { etiquette: "Port de débarquement", valeur: q.port_discharge },
          ]}
        />

        <Tableau lignes={lignes} devise={d.devise} entetes={{ reference: "Ligne", designation: "Prestation / Service" }} />

        <View style={styles.bas}>
          <Conditions
            elements={[
              {
                titre: "Conditions :",
                texte: `conformes à la pro forma ${d.pro_forma ?? "acceptée"}. Acompte de ${d.pourcentage_acompte} % exigible après validation de la facture finale détaillée, solde de ${d.pourcentage_solde} % contre documents d'expédition.`,
              },
              {
                titre: "Portée :",
                texte:
                  "Le montant ci-dessous reprend la pro forma acceptée. Les droits et taxes d'importation en RDC, le transport jusqu'à destination finale et la commission Alpha Import sont arrêtés sur la facture finale.",
              },
              {
                titre: "Conditions générales :",
                texte: d.signature?.le
                  ? `acceptées le ${dateFr(d.signature.le)}${d.signature.version ? ` (version ${d.signature.version})` : ""}${d.signature.adresse ? `, depuis ${d.signature.adresse}` : ""}.`
                  : "à accepter par le client lors de la validation de la facture finale.",
              },
            ]}
          />
          <Totaux
            lignes={[
              { libelle: "Total commandé", montant: d.total, ton: "fort" },
              { libelle: `Acompte ${d.pourcentage_acompte} %`, montant: acompte, ton: "or" },
              { libelle: `Solde ${d.pourcentage_solde} %`, montant: solde },
            ]}
            devise={d.devise}
          />
        </View>

        {d.signature?.le ? (
          <Text style={styles.mention}>
            Signé électroniquement par le client le {dateFr(d.signature.le)}
            {d.signature.adresse ? ` depuis l'adresse ${d.signature.adresse}` : ""} lors de la validation de la facture finale.
          </Text>
        ) : null}

        <Signatures
          blocs={[
            { titre: "Client — bon pour accord", sous: d.client.societe || d.client.nom },
            { titre: "Alpha Import Exchange", sous: "Direction des opérations" },
          ]}
        />

        <Pied reference={`${d.numero} · ${formatMontant(d.total, d.devise)}`} />
      </Page>
    </Document>
  )
}

export async function genererBonDeCommandePdf(d: DonneesBonDeCommande): Promise<Buffer> {
  return renderToBuffer(<BonDeCommandeDocument d={d} />)
}
