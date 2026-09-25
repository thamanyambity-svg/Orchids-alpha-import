import { readFileSync } from "node:fs"
import { join } from "node:path"
import { Text, View, Image, Font } from "@react-pdf/renderer"
import { styles } from "./styles"
import { ENTREPRISE, lignesEmetteur, lignesBanque, piedEntreprise } from "@/lib/documents/entreprise"
import { formatMontant, dateFr } from "@/lib/quotes/workflow"

/**
 * Blocs communs aux documents commerciaux, repris de la maquette fournie :
 * en-tête, bandeau d'identification, parties, informations logistiques,
 * tableau de lignes, totaux, signatures et pied de page.
 *
 * Chaque document (pro forma, bon de commande, facture) assemble ces blocs :
 * la présentation reste la même d'un document à l'autre, et une correction
 * de mise en page profite aux trois.
 */

/** Emblème lu une seule fois ; absent, l'en-tête s'imprime sans lui. */
const LOGO: string | null = (() => {
  try {
    const octets = readFileSync(join(process.cwd(), "public", "logo-embleme.png"))
    return `data:image/png;base64,${octets.toString("base64")}`
  } catch {
    return null
  }
})()

// Pas de césure : « droits et taxes » se coupait en « tax-es » au fil du texte.
Font.registerHyphenationCallback((mot) => [mot])

/**
 * Texte sûr pour les polices standard du format PDF : elles ne couvrent que
 * le jeu WinAnsi. Une flèche saisie par l'administration ou un partenaire y
 * devenait une apostrophe ; on la remplace par son équivalent en caractères
 * ordinaires.
 */
export function texteSur(valeur: unknown): string {
  return String(valeur ?? "")
    .replace(/[\u2192\u27F6\u2794\u279C]/g, "->")
    .replace(/[\u2190\u27F5]/g, "<-")
    .replace(/[\u2194\u27F7]/g, "<->")
    .replace(/\u21D2/g, "=>")
    .replace(/\u2265/g, ">=")
    .replace(/\u2264/g, "<=")
}

export interface Champ {
  etiquette: string
  valeur: string | null | undefined
}

export interface LigneDocument {
  reference?: string
  designation: string
  quantite?: number | string | null
  prixUnitaire?: number | null
  montant: number | null
  /** Ligne d'intitulé de groupe (catégorie), sans montant propre. */
  groupe?: boolean
}

const renseignes = (champs: Champ[]) => champs.filter((c) => c.valeur !== null && c.valeur !== undefined && String(c.valeur).trim() !== "")

export function Entete({ titre, titreAnglais }: { titre: string; titreAnglais: string }) {
  return (
    <View style={styles.entete}>
      <View>
        <View style={styles.marqueLigne}>
          {LOGO ? <Image src={LOGO} style={styles.logo} /> : null}
          <View>
            <Text style={styles.marque}>{ENTREPRISE.nom}</Text>
            <Text style={styles.activite}>{ENTREPRISE.activite}</Text>
          </View>
        </View>
      </View>
      <View>
        <Text style={styles.titre}>{titre}</Text>
        <Text style={styles.sousTitre}>{titreAnglais}</Text>
      </View>
    </View>
  )
}

/** Bandeau d'identification : numéro, dates, devise — quatre cases au plus. */
export function Bandeau({ champs }: { champs: Champ[] }) {
  return (
    <View style={styles.bandeau}>
      {renseignes(champs).map((c) => (
        <View key={c.etiquette} style={styles.case}>
          <Text style={styles.etiquette}>{c.etiquette}</Text>
          <Text style={styles.valeur}>{c.valeur}</Text>
        </View>
      ))}
    </View>
  )
}

export interface Partie {
  titre: string
  nom: string
  lignes: (string | null | undefined)[]
}

export function Parties({ gauche, droite }: { gauche: Partie; droite: Partie }) {
  return (
    <View style={styles.parties}>
      {[gauche, droite].map((p) => (
        <View key={p.titre} style={styles.partie}>
          <Text style={styles.titrePartie}>{p.titre}</Text>
          <Text style={styles.nomPartie}>{p.nom}</Text>
          {p.lignes
            .filter((l): l is string => Boolean(l && l.trim()))
            .map((l, i) => (
              <Text key={i}>{texteSur(l)}</Text>
            ))}
        </View>
      ))}
    </View>
  )
}

/** Partie « émetteur », identique sur les trois documents. */
export function partieAlpha(titre = "Émetteur / Issued by"): Partie {
  const [, ...suite] = lignesEmetteur()
  return { titre, nom: ENTREPRISE.raisonSociale, lignes: suite }
}

export function Infos({ champs }: { champs: Champ[] }) {
  const utiles = renseignes(champs)
  if (utiles.length === 0) return null
  return (
    <View style={styles.infos}>
      {utiles.map((c) => (
        <View key={c.etiquette} style={styles.info}>
          <Text style={styles.infoEtiquette}>{c.etiquette}</Text>
          <Text style={styles.infoValeur}>{texteSur(c.valeur)}</Text>
        </View>
      ))}
    </View>
  )
}

export function Tableau({ lignes, devise, entetes }: { lignes: LigneDocument[]; devise: string; entetes?: { reference: string; designation: string } }) {
  const ref = entetes?.reference ?? "Réf."
  const designation = entetes?.designation ?? "Désignation / Description"
  return (
    <View style={styles.tableau}>
      <View style={styles.enteteTableau}>
        <Text style={[styles.celluleEntete, styles.colRef]}>{ref}</Text>
        <Text style={[styles.celluleEntete, styles.colDesignation]}>{designation}</Text>
        <Text style={[styles.celluleEntete, styles.colQte]}>Qté</Text>
        <Text style={[styles.celluleEntete, styles.colPU]}>P.U.</Text>
        <Text style={[styles.celluleEntete, styles.colMontant]}>Montant</Text>
      </View>
      {lignes.map((l, i) =>
        l.groupe ? (
          <View key={i} style={styles.groupe}>
            <Text style={[styles.cellule, styles.colRef]}> </Text>
            <Text style={[styles.cellule, styles.colDesignation, { fontFamily: "Helvetica-Bold" }]}>{texteSur(l.designation)}</Text>
            <Text style={[styles.cellule, styles.colQte]}> </Text>
            <Text style={[styles.cellule, styles.colPU]}> </Text>
            <Text style={[styles.cellule, styles.colMontant, { fontFamily: "Helvetica-Bold" }]}>
              {l.montant === null ? " " : formatMontant(l.montant, devise)}
            </Text>
          </View>
        ) : (
          <View key={i} style={styles.ligne} wrap={false}>
            <Text style={[styles.cellule, styles.colRef, { color: "#5B6475" }]}>{l.reference ?? ""}</Text>
            <Text style={[styles.cellule, styles.colDesignation]}>{texteSur(l.designation)}</Text>
            <Text style={[styles.cellule, styles.colQte]}>{l.quantite ?? ""}</Text>
            <Text style={[styles.cellule, styles.colPU]}>{l.prixUnitaire != null ? formatMontant(l.prixUnitaire, devise) : ""}</Text>
            <Text style={[styles.cellule, styles.colMontant]}>{l.montant != null ? formatMontant(l.montant, devise) : ""}</Text>
          </View>
        )
      )}
    </View>
  )
}

export interface LigneTotal {
  libelle: string
  montant: number
  /** Mise en avant : total principal en bandeau sombre, ou ligne dorée. */
  ton?: "normal" | "fort" | "or"
  signe?: "moins"
}

export function Totaux({ lignes, devise }: { lignes: LigneTotal[]; devise: string }) {
  return (
    <View style={styles.totaux}>
      {lignes.map((l) => {
        const montant = `${l.signe === "moins" ? "− " : ""}${formatMontant(l.montant, devise)}`
        if (l.ton === "fort") {
          return (
            <View key={l.libelle} style={styles.totalFort}>
              <Text>{l.libelle}</Text>
              <Text>{montant}</Text>
            </View>
          )
        }
        return (
          <View key={l.libelle} style={l.ton === "or" ? styles.totalOr : styles.totalLigne}>
            <Text>{l.libelle}</Text>
            <Text>{montant}</Text>
          </View>
        )
      })}
    </View>
  )
}

export function Conditions({ elements }: { elements: { titre: string; texte: string }[] }) {
  return (
    <View style={styles.conditions}>
      {elements
        .filter((e) => e.texte && e.texte.trim())
        .map((e) => (
          <Text key={e.titre} style={{ marginBottom: 4 }}>
            <Text style={styles.conditionTitre}>{e.titre} </Text>
            {texteSur(e.texte)}
          </Text>
        ))}
    </View>
  )
}

/** Coordonnées bancaires ; rien ne s'imprime tant qu'elles ne sont pas renseignées. */
export function Banque({ titre = "Règlement par virement / Payment by wire transfer" }: { titre?: string }) {
  const lignes = lignesBanque()
  if (!lignes) return null
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.titrePartie}>{titre}</Text>
      {lignes.map((l, i) => (
        <Text key={i} style={{ fontSize: 8.5 }}>{l}</Text>
      ))}
    </View>
  )
}

export function Signatures({ blocs }: { blocs: { titre: string; sous?: string }[] }) {
  return (
    <View style={styles.signatures}>
      {blocs.map((b) => (
        <View key={b.titre} style={styles.signature}>
          <Text style={styles.titrePartie}>{b.titre}</Text>
          <Text style={styles.traitSignature}>{b.sous ?? " "}</Text>
        </View>
      ))}
    </View>
  )
}

export function Pied({ reference }: { reference?: string }) {
  // Pas de numérotation dynamique : `render` imbriqué dans un bloc fixe
  // empêchait l'affichage du pied entier. La référence du document, plus
  // utile qu'un numéro de page sur un document d'une ou deux pages, occupe
  // la droite ; chaque colonne a sa largeur pour éviter le chevauchement.
  return (
    <View style={styles.pied} fixed>
      <Text style={styles.piedGauche}>{piedEntreprise()}</Text>
      <Text style={styles.piedDroite}>{reference ?? " "}</Text>
    </View>
  )
}

export { dateFr, formatMontant }
