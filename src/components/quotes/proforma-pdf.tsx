import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer"
import { CHAMPS_FRAIS, formatMontant, dateFr } from "@/lib/quotes/workflow"

/**
 * Pro forma au format PDF, produite à la demande à partir de la base : elle
 * reflète toujours la version enregistrée, sans fichier à téléverser.
 *
 * Polices standard du format PDF (Helvetica) : aucune dépendance réseau au
 * moment du rendu.
 */

export interface DonneesProForma {
  reference: string
  version: number
  statut: string
  emise_le: string | null
  valable_jusqu_au: string | null
  client: { nom: string; societe?: string | null; email?: string | null }
  partenaire: { societe: string; pays?: string | null }
  produit: string
  categorie?: string | null
  transport?: string | null
  quote: Record<string, any>
}

const OR = "#8E6E2E"
const ENCRE = "#15171C"
const GRIS = "#5B6170"
const FILET = "#DDE0E6"

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 9.5, color: ENCRE, lineHeight: 1.4 },
  entete: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: OR, paddingBottom: 14, marginBottom: 18 },
  marque: { fontSize: 18, fontFamily: "Helvetica-Bold", letterSpacing: 2 },
  sousMarque: { fontSize: 7, color: GRIS, letterSpacing: 1.5, marginTop: 3 },
  titre: { fontSize: 16, fontFamily: "Helvetica-Bold", color: OR, textAlign: "right" },
  ref: { fontSize: 8, color: GRIS, textAlign: "right", marginTop: 3 },
  bandeau: { backgroundColor: "#FBF0DA", color: "#9A6200", padding: 8, marginBottom: 14, fontSize: 8.5, fontFamily: "Helvetica-Bold" },
  deuxCol: { flexDirection: "row", gap: 16, marginBottom: 16 },
  bloc: { flex: 1, borderWidth: 1, borderColor: FILET, padding: 10 },
  etiquette: { fontSize: 7, color: GRIS, letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 },
  gras: { fontFamily: "Helvetica-Bold" },
  table: { borderWidth: 1, borderColor: FILET, marginBottom: 14 },
  ligne: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: FILET, paddingVertical: 6, paddingHorizontal: 8 },
  enteteTable: { backgroundColor: "#F3F4F6" },
  cDesc: { flex: 3 },
  cNum: { flex: 1, textAlign: "right" },
  total: { flexDirection: "row", justifyContent: "space-between", backgroundColor: ENCRE, color: "#FFFFFF", padding: 10, marginBottom: 14 },
  totalTexte: { fontFamily: "Helvetica-Bold", fontSize: 12 },
  grille: { flexDirection: "row", flexWrap: "wrap", marginBottom: 14 },
  case: { width: "33.33%", paddingVertical: 4, paddingRight: 8 },
  pied: { position: "absolute", bottom: 28, left: 40, right: 40, fontSize: 7, color: GRIS, borderTopWidth: 1, borderTopColor: FILET, paddingTop: 6 },
})

const LIBELLES_FRAIS: Record<(typeof CHAMPS_FRAIS)[number], string> = {
  freight_cost_usd: "Fret",
  insurance_cost_usd: "Assurance",
  customs_duty_estimate_usd: "Droits de douane estimés",
  inspection_cost_usd: "Inspection",
  handling_fees_usd: "Manutention",
  other_fees_usd: "Autres frais",
}

function ProFormaDocument({ d }: { d: DonneesProForma }) {
  const q = d.quote
  const devise = q.currency ?? "USD"
  const frais = CHAMPS_FRAIS.filter((c) => Number(q[c] ?? 0) > 0)
  const provisoire = d.statut === "DRAFT" || d.statut === "REJECTED"

  return (
    <Document title={`Pro forma ${d.reference} v${d.version}`} author="Alpha Import Exchange RDC">
      <Page size="A4" style={s.page}>
        <View style={s.entete}>
          <View>
            <Text style={s.marque}>ALPHA IMPORT EXCHANGE</Text>
            <Text style={s.sousMarque}>AONOSEKE HOUSE INVESTMENT RDC</Text>
          </View>
          <View>
            <Text style={s.titre}>FACTURE PRO FORMA</Text>
            <Text style={s.ref}>{d.reference} · version {d.version}</Text>
            <Text style={s.ref}>Émise le {dateFr(d.emise_le)} · valable jusqu'au {dateFr(d.valable_jusqu_au)}</Text>
          </View>
        </View>

        {provisoire && (
          <Text style={s.bandeau}>
            DOCUMENT PROVISOIRE — en cours de vérification par Alpha Import, non transmis au client, sans valeur d'engagement.
          </Text>
        )}

        <View style={s.deuxCol}>
          <View style={s.bloc}>
            <Text style={s.etiquette}>Client</Text>
            <Text style={s.gras}>{d.client.societe || d.client.nom}</Text>
            {d.client.societe ? <Text>{d.client.nom}</Text> : null}
            {d.client.email ? <Text>{d.client.email}</Text> : null}
          </View>
          <View style={s.bloc}>
            <Text style={s.etiquette}>Partenaire d'achat</Text>
            <Text style={s.gras}>{d.partenaire.societe}</Text>
            {d.partenaire.pays ? <Text>{d.partenaire.pays}</Text> : null}
          </View>
        </View>

        <View style={s.table}>
          <View style={[s.ligne, s.enteteTable]}>
            <Text style={[s.cDesc, s.gras]}>Désignation</Text>
            <Text style={[s.cNum, s.gras]}>Qté</Text>
            <Text style={[s.cNum, s.gras]}>Prix unitaire</Text>
            <Text style={[s.cNum, s.gras]}>Montant</Text>
          </View>
          <View style={s.ligne}>
            <Text style={s.cDesc}>{d.produit}{d.categorie ? ` (${d.categorie})` : ""}</Text>
            <Text style={s.cNum}>{q.quantity}</Text>
            <Text style={s.cNum}>{formatMontant(q.unit_price_usd, devise)}</Text>
            <Text style={s.cNum}>{formatMontant(q.subtotal_usd, devise)}</Text>
          </View>
          {frais.map((c) => (
            <View key={c} style={s.ligne}>
              <Text style={s.cDesc}>{LIBELLES_FRAIS[c]}</Text>
              <Text style={s.cNum}></Text>
              <Text style={s.cNum}></Text>
              <Text style={s.cNum}>{formatMontant(q[c], devise)}</Text>
            </View>
          ))}
        </View>

        <View style={s.total}>
          <Text style={s.totalTexte}>TOTAL {q.incoterm ?? ""}</Text>
          <Text style={s.totalTexte}>{formatMontant(q.grand_total_usd, devise)}</Text>
        </View>

        <View style={s.grille}>
          <View style={s.case}><Text style={s.etiquette}>Incoterm</Text><Text>{q.incoterm ?? "—"}</Text></View>
          <View style={s.case}><Text style={s.etiquette}>Port d'embarquement</Text><Text>{q.port_loading || "—"}</Text></View>
          <View style={s.case}><Text style={s.etiquette}>Port de débarquement</Text><Text>{q.port_discharge || "—"}</Text></View>
          <View style={s.case}><Text style={s.etiquette}>Transport</Text><Text>{d.transport === "AIR" ? "Aérien" : d.transport === "SEA" ? "Maritime" : "—"}</Text></View>
          <View style={s.case}><Text style={s.etiquette}>Transit estimé</Text><Text>{q.estimated_transit_days ? `${q.estimated_transit_days} jours` : "—"}</Text></View>
          <View style={s.case}><Text style={s.etiquette}>Départ / arrivée estimés</Text><Text>{dateFr(q.estimated_departure_date)} → {dateFr(q.estimated_arrival_date)}</Text></View>
        </View>

        <View style={[s.bloc, { marginBottom: 10 }]}>
          <Text style={s.etiquette}>Conditions de paiement</Text>
          <Text>{q.payment_terms || "—"}</Text>
        </View>
        {q.notes ? (
          <View style={s.bloc}>
            <Text style={s.etiquette}>Notes</Text>
            <Text>{q.notes}</Text>
          </View>
        ) : null}

        <Text style={s.pied} fixed>
          Pro forma indicative : les droits et taxes d'importation en RDC, le transport jusqu'à destination finale et la commission Alpha Import figurent sur la facture finale, émise avant tout paiement.
        </Text>
      </Page>
    </Document>
  )
}

export async function genererProFormaPdf(d: DonneesProForma): Promise<Buffer> {
  return renderToBuffer(<ProFormaDocument d={d} />)
}
