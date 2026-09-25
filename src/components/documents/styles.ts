import { StyleSheet } from "@react-pdf/renderer"

/**
 * Mise en page commune des documents commerciaux : pro forma, bon de
 * commande, facture finale.
 *
 * Reprise de la maquette fournie — bandeau d'identification en haut,
 * blocs émetteur / client, bande d'informations logistiques, tableau de
 * lignes, bloc de totaux à droite, signature et pied de page — dans les
 * couleurs d'Alpha Import : bleu nuit et or.
 */

export const NUIT = "#0A1628"
export const OR = "#8E6E2E"
export const GRIS = "#5B6475"
export const FILET = "#D9DEE6"
export const FOND = "#F4F2EC"

export const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingHorizontal: 38,
    paddingBottom: 48,
    fontFamily: "Helvetica",
    fontSize: 9,
    lineHeight: 1.45,
    color: NUIT,
  },

  // ---- En-tête -----------------------------------------------------------
  entete: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 20 },
  marqueLigne: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { width: 34, height: 34 },
  marque: { fontFamily: "Helvetica-Bold", fontSize: 17, letterSpacing: 1.2 },
  activite: { fontSize: 7.5, color: GRIS, letterSpacing: 0.6, textTransform: "uppercase", marginTop: 2 },
  titre: { fontFamily: "Helvetica-Bold", fontSize: 21, color: OR, textAlign: "right", lineHeight: 1.1 },
  sousTitre: { fontSize: 8.5, color: GRIS, textTransform: "uppercase", letterSpacing: 0.8, textAlign: "right" },

  // ---- Bandeau d'identification (N°, dates, devise) ----------------------
  bandeau: {
    flexDirection: "row",
    borderTopWidth: 2,
    borderTopColor: NUIT,
    borderBottomWidth: 1,
    borderBottomColor: FILET,
    marginTop: 10,
  },
  case: { flex: 1, paddingVertical: 7, paddingRight: 10 },
  etiquette: { fontSize: 7, color: GRIS, textTransform: "uppercase", letterSpacing: 0.5 },
  valeur: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 2 },

  // ---- Parties (émetteur / client) ---------------------------------------
  parties: { flexDirection: "row", gap: 22, marginTop: 11 },
  partie: { flex: 1 },
  titrePartie: { fontSize: 7.5, color: OR, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
  nomPartie: { fontFamily: "Helvetica-Bold", fontSize: 10.5 },

  // ---- Bande d'informations ----------------------------------------------
  infos: { backgroundColor: FOND, padding: 8, marginTop: 11, flexDirection: "row", flexWrap: "wrap" },
  info: { width: "33.33%", paddingVertical: 2, paddingRight: 10 },
  infoEtiquette: { fontSize: 7, color: GRIS, textTransform: "uppercase", letterSpacing: 0.4 },
  infoValeur: { fontSize: 9 },

  // ---- Tableau des lignes -------------------------------------------------
  tableau: { marginTop: 11 },
  enteteTableau: { flexDirection: "row", backgroundColor: NUIT, color: "#FFFFFF" },
  ligne: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: FILET },
  cellule: { paddingVertical: 4, paddingHorizontal: 6 },
  celluleEntete: { paddingVertical: 6, paddingHorizontal: 6, fontSize: 7.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.4 },
  colRef: { width: "12%" },
  colDesignation: { flex: 1 },
  colQte: { width: "9%", textAlign: "right" },
  colPU: { width: "16%", textAlign: "right" },
  colMontant: { width: "18%", textAlign: "right" },
  groupe: { flexDirection: "row", backgroundColor: FOND },

  // ---- Bas de page : conditions + totaux ----------------------------------
  bas: { flexDirection: "row", gap: 22, marginTop: 11, alignItems: "flex-start" },
  conditions: { flex: 1, fontSize: 8.5 },
  conditionTitre: { fontFamily: "Helvetica-Bold" },
  totaux: { width: 200 },
  totalLigne: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: FILET },
  totalFort: { flexDirection: "row", justifyContent: "space-between", backgroundColor: NUIT, color: "#FFFFFF", paddingVertical: 7, paddingHorizontal: 9, marginTop: 5, fontFamily: "Helvetica-Bold", fontSize: 11 },
  totalOr: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, color: OR, fontFamily: "Helvetica-Bold" },

  // ---- Signature et pied --------------------------------------------------
  signatures: { flexDirection: "row", gap: 22, marginTop: 14 },
  signature: { flex: 1 },
  traitSignature: { borderTopWidth: 1, borderTopColor: NUIT, paddingTop: 5, marginTop: 18, fontSize: 8, color: GRIS },
  mention: { marginTop: 12, fontSize: 8, color: GRIS },
  bandeauAlerte: { backgroundColor: "#FBF0DA", color: "#8A5A00", padding: 7, marginTop: 12, fontSize: 8.5, fontFamily: "Helvetica-Bold" },
  piedGauche: { flex: 1, paddingRight: 12 },
  piedDroite: { textAlign: "right" },
  pied: {
    position: "absolute",
    bottom: 22,
    left: 38,
    right: 38,
    borderTopWidth: 1,
    borderTopColor: FILET,
    paddingTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: GRIS,
  },
})
