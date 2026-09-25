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
import { CATEGORIES, LIBELLES_CATEGORIES, totauxFacture, type LigneFacture } from "@/lib/invoices/final"
import { formatMontant, dateFr } from "@/lib/quotes/workflow"

/**
 * Facture finale détaillée : marchandise, transport, droits et taxes RDC,
 * services et commission, groupés par nature, avec l'échéancier 60 / 40.
 *
 * Même présentation que la pro forma et le bon de commande — un seul jeu de
 * blocs les compose tous les trois.
 */

export interface DonneesFactureFinale {
  numero: string
  statut: string
  emise_le: string | null
  validee_le: string | null
  reference_demande: string
  bon_de_commande: string
  devise: string
  pourcentage_acompte: number
  client: { nom: string; societe?: string | null; email?: string | null; ville?: string | null }
  produit: string
  lignes: LigneFacture[]
  notes?: string | null
  /** Renseignés quand l'acompte a été encaissé. */
  acompte_recu?: number | null
  acompte_recu_le?: string | null
}

const REFERENCES: Record<string, string> = {
  MARCHANDISE: "MAR",
  LOGISTIQUE: "LOG",
  DOUANE: "DOU",
  SERVICE: "SRV",
  COMMISSION: "COM",
}

function FactureDocument({ d }: { d: DonneesFactureFinale }) {
  const t = totauxFacture(d.lignes, d.pourcentage_acompte)
  const brouillon = d.statut === "DRAFT"
  const recu = Number(d.acompte_recu ?? 0)

  // Une section par nature de frais, comme sur le modèle commercial.
  const lignes: LigneDocument[] = []
  for (const categorie of CATEGORIES.filter((c) => t.parCategorie[c] > 0)) {
    lignes.push({ designation: LIBELLES_CATEGORIES[categorie], montant: t.parCategorie[categorie], groupe: true })
    d.lignes
      .filter((l) => l.categorie === categorie)
      .forEach((l, i) =>
        lignes.push({
          reference: `${REFERENCES[categorie] ?? "DIV"}-${String(i + 1).padStart(2, "0")}`,
          designation: l.libelle,
          montant: l.montant,
        })
      )
  }

  const totaux = [
    { libelle: "Total à payer", montant: t.total, ton: "fort" as const },
    { libelle: `Acompte ${d.pourcentage_acompte} %`, montant: t.acompte, ton: "or" as const },
    { libelle: `Solde ${100 - d.pourcentage_acompte} %`, montant: t.solde },
  ]
  if (recu > 0) {
    totaux.push({ libelle: "Acompte reçu", montant: recu, ton: "normal" as const, signe: "moins" } as never)
    totaux.push({ libelle: "Net à payer", montant: Math.round((t.total - recu) * 100) / 100, ton: "or" as const })
  }

  return (
    <Document title={`Facture ${d.numero}`} author="Alpha Import Exchange">
      <Page size="A4" style={styles.page}>
        <Entete titre="Facture finale" titreAnglais="Commercial invoice" />

        <Bandeau
          champs={[
            { etiquette: "N° / Invoice No.", valeur: d.numero },
            { etiquette: "Date", valeur: dateFr(d.emise_le) },
            { etiquette: "Bon de commande / PO", valeur: d.bon_de_commande },
            { etiquette: "Devise / Currency", valeur: d.devise },
          ]}
        />

        {brouillon && (
          <Text style={styles.bandeauAlerte}>BROUILLON — non émis au client, montants susceptibles de changer.</Text>
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
            { etiquette: "Demande", valeur: d.reference_demande },
            { etiquette: "Objet", valeur: d.produit },
            { etiquette: "Validée le", valeur: d.validee_le ? dateFr(d.validee_le) : "En attente de validation" },
          ]}
        />

        <Tableau lignes={lignes} devise={d.devise} entetes={{ reference: "Réf.", designation: "Désignation / Description" }} />

        <View style={styles.bas}>
          <Conditions
            elements={[
              {
                titre: "Échéancier :",
                texte: `acompte de ${d.pourcentage_acompte} % à la validation de la présente facture, solde de ${100 - d.pourcentage_acompte} % contre documents d'expédition.`,
              },
              {
                titre: "Acompte :",
                texte: recu > 0 ? `${formatMontant(recu, d.devise)} reçu${d.acompte_recu_le ? ` le ${dateFr(d.acompte_recu_le)}` : ""}.` : "",
              },
              { titre: "Notes :", texte: d.notes || "" },
              {
                titre: "Valeur :",
                texte: `la validation de cette facture vaut signature du bon de commande ${d.bon_de_commande} et acceptation des conditions générales de vente d'Alpha Import Exchange.`,
              },
            ]}
          />
          <Totaux lignes={totaux as never} devise={d.devise} />
        </View>

        <Banque />

        <Signatures
          blocs={[
            { titre: "Client — bon pour accord", sous: d.client.societe || d.client.nom },
            { titre: "Cachet et signature de l'émetteur", sous: "Service facturation — Alpha Import Exchange" },
          ]}
        />

        <Pied reference={`${d.numero} · ${formatMontant(t.total, d.devise)}`} />
      </Page>
    </Document>
  )
}

export async function genererFactureFinalePdf(d: DonneesFactureFinale): Promise<Buffer> {
  return renderToBuffer(<FactureDocument d={d} />)
}
