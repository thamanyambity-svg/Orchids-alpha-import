import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer"
import { CATEGORIES, LIBELLES_CATEGORIES, totauxFacture, type LigneFacture } from "@/lib/invoices/final"
import { formatMontant, dateFr } from "@/lib/quotes/workflow"

/**
 * Facture finale détaillée au format PDF, produite à la demande depuis la base.
 * Polices standard du format PDF : aucune dépendance réseau au rendu.
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
  client: { nom: string; societe?: string | null; email?: string | null }
  produit: string
  lignes: LigneFacture[]
  notes?: string | null
}

const OR = "#8E6E2E"
const ENCRE = "#15171C"
const GRIS = "#5B6170"
const FILET = "#DDE0E6"

const s = StyleSheet.create({
  page: { padding: 40, paddingBottom: 60, fontFamily: "Helvetica", fontSize: 9.5, color: ENCRE, lineHeight: 1.4 },
  entete: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: OR, paddingBottom: 14, marginBottom: 18 },
  marque: { fontSize: 18, fontFamily: "Helvetica-Bold", letterSpacing: 2 },
  sousMarque: { fontSize: 7, color: GRIS, letterSpacing: 1.5, marginTop: 3 },
  titre: { fontSize: 16, fontFamily: "Helvetica-Bold", color: OR, textAlign: "right" },
  ref: { fontSize: 8, color: GRIS, textAlign: "right", marginTop: 3 },
  bandeau: { backgroundColor: "#FBF0DA", color: "#9A6200", padding: 8, marginBottom: 14, fontSize: 8.5, fontFamily: "Helvetica-Bold" },
  bloc: { borderWidth: 1, borderColor: FILET, padding: 10, marginBottom: 16 },
  etiquette: { fontSize: 7, color: GRIS, letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 },
  gras: { fontFamily: "Helvetica-Bold" },
  groupe: { marginBottom: 10 },
  titreGroupe: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#F3F4F6", paddingVertical: 5, paddingHorizontal: 8, fontFamily: "Helvetica-Bold" },
  ligne: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: FILET },
  total: { flexDirection: "row", justifyContent: "space-between", backgroundColor: ENCRE, color: "#FFFFFF", padding: 10, marginTop: 6, marginBottom: 10 },
  totalTexte: { fontFamily: "Helvetica-Bold", fontSize: 12 },
  echeancier: { flexDirection: "row", gap: 10, marginBottom: 14 },
  tranche: { flex: 1, borderWidth: 1, borderColor: OR, padding: 10 },
  montantTranche: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 2 },
  pied: { position: "absolute", bottom: 26, left: 40, right: 40, fontSize: 7, color: GRIS, borderTopWidth: 1, borderTopColor: FILET, paddingTop: 6 },
})

function FactureDocument({ d }: { d: DonneesFactureFinale }) {
  const t = totauxFacture(d.lignes, d.pourcentage_acompte)
  const brouillon = d.statut === "DRAFT"
  return (
    <Document title={`Facture ${d.numero}`} author="Alpha Import Exchange RDC">
      <Page size="A4" style={s.page}>
        <View style={s.entete}>
          <View>
            <Text style={s.marque}>ALPHA IMPORT EXCHANGE</Text>
            <Text style={s.sousMarque}>AONOSEKE HOUSE INVESTMENT RDC</Text>
          </View>
          <View>
            <Text style={s.titre}>FACTURE FINALE</Text>
            <Text style={s.ref}>{d.numero}</Text>
            <Text style={s.ref}>Demande {d.reference_demande} · bon de commande {d.bon_de_commande}</Text>
            <Text style={s.ref}>Émise le {dateFr(d.emise_le)}{d.validee_le ? ` · validée le ${dateFr(d.validee_le)}` : ""}</Text>
          </View>
        </View>

        {brouillon && (
          <Text style={s.bandeau}>BROUILLON — non émis au client, montants susceptibles de changer.</Text>
        )}

        <View style={s.bloc}>
          <Text style={s.etiquette}>Client</Text>
          <Text style={s.gras}>{d.client.societe || d.client.nom}</Text>
          {d.client.societe ? <Text>{d.client.nom}</Text> : null}
          {d.client.email ? <Text>{d.client.email}</Text> : null}
          <Text style={{ marginTop: 6 }}>Objet : {d.produit}</Text>
        </View>

        {CATEGORIES.filter((c) => t.parCategorie[c] > 0).map((c) => (
          <View key={c} style={s.groupe} wrap={false}>
            <View style={s.titreGroupe}>
              <Text>{LIBELLES_CATEGORIES[c]}</Text>
              <Text>{formatMontant(t.parCategorie[c], d.devise)}</Text>
            </View>
            {d.lignes.filter((l) => l.categorie === c).map((l, i) => (
              <View key={i} style={s.ligne}>
                <Text>{l.libelle}</Text>
                <Text>{formatMontant(l.montant, d.devise)}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={s.total}>
          <Text style={s.totalTexte}>TOTAL À PAYER</Text>
          <Text style={s.totalTexte}>{formatMontant(t.total, d.devise)}</Text>
        </View>

        <View style={s.echeancier}>
          <View style={s.tranche}>
            <Text style={s.etiquette}>Acompte {d.pourcentage_acompte} % — à la validation</Text>
            <Text style={s.montantTranche}>{formatMontant(t.acompte, d.devise)}</Text>
          </View>
          <View style={s.tranche}>
            <Text style={s.etiquette}>Solde {100 - d.pourcentage_acompte} % — contre documents d'expédition</Text>
            <Text style={s.montantTranche}>{formatMontant(t.solde, d.devise)}</Text>
          </View>
        </View>

        {d.notes ? (
          <View style={s.bloc}>
            <Text style={s.etiquette}>Notes</Text>
            <Text>{d.notes}</Text>
          </View>
        ) : null}

        <Text style={s.pied} fixed>
          La validation de cette facture vaut signature du bon de commande {d.bon_de_commande} et acceptation des conditions générales de vente d'Alpha Import Exchange.
        </Text>
      </Page>
    </Document>
  )
}

export async function genererFactureFinalePdf(d: DonneesFactureFinale): Promise<Buffer> {
  return renderToBuffer(<FactureDocument d={d} />)
}
