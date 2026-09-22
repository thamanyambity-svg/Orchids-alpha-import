/**
 * Facture finale détaillée.
 *
 * Elle reprend la pro forma acceptée (marchandise et frais du partenaire) et
 * y ajoute ce qu'Alpha Import est seul à chiffrer : droits et taxes
 * d'importation en RDC, dédouanement, transport jusqu'à destination finale,
 * commission. Aucun taux n'est calculé ici : chaque montant est saisi par
 * l'administration, à partir des décomptes réels.
 *
 * Circuit : brouillon (DRAFT) → émise au client (SENT) → validée par le
 * client (validated_at, vaut signature du bon de commande et des CGV) →
 * acompte de 60 %. Contestée, elle revient en brouillon avec le motif.
 */

export const CATEGORIES = ['MARCHANDISE', 'LOGISTIQUE', 'DOUANE', 'SERVICE', 'COMMISSION'] as const
export type Categorie = (typeof CATEGORIES)[number]

export const LIBELLES_CATEGORIES: Record<Categorie, string> = {
  MARCHANDISE: 'Marchandise',
  LOGISTIQUE: 'Transport et logistique',
  DOUANE: 'Douane, droits et taxes RDC',
  SERVICE: 'Services',
  COMMISSION: 'Commission Alpha Import',
}

export interface LigneFacture {
  libelle: string
  categorie: Categorie
  montant: number
}

const arrondi = (n: number) => Math.round(n * 100) / 100

/** Lignes de départ : la pro forma acceptée, puis les postes qu'Alpha Import doit compléter (à zéro). */
export function lignesDepuisProForma(q: Record<string, any>): LigneFacture[] {
  const devise = q.currency ?? 'USD'
  const pu = Number(q.unit_price_usd ?? 0)
  const lignes: LigneFacture[] = [
    {
      libelle: `Marchandise — ${q.quantity} × ${pu.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${devise}`,
      categorie: 'MARCHANDISE',
      montant: arrondi(Number(q.subtotal_usd ?? pu * Number(q.quantity ?? 0))),
    },
  ]
  const frais: [string, string, Categorie][] = [
    ['freight_cost_usd', `Fret international${q.incoterm ? ` (${q.incoterm})` : ''}`, 'LOGISTIQUE'],
    ['insurance_cost_usd', 'Assurance transport', 'LOGISTIQUE'],
    ['handling_fees_usd', 'Manutention', 'LOGISTIQUE'],
    ['inspection_cost_usd', 'Inspection avant embarquement', 'SERVICE'],
    ['customs_duty_estimate_usd', 'Droits et frais au départ (pro forma)', 'DOUANE'],
    ['other_fees_usd', 'Autres frais du partenaire', 'SERVICE'],
  ]
  for (const [champ, libelle, categorie] of frais) {
    const m = Number(q[champ] ?? 0)
    if (m > 0) lignes.push({ libelle, categorie, montant: arrondi(m) })
  }
  // Postes propres à Alpha Import, à chiffrer par l'administration.
  lignes.push(
    { libelle: "Droits de douane à l'importation (DGDA)", categorie: 'DOUANE', montant: 0 },
    { libelle: "TVA à l'importation", categorie: 'DOUANE', montant: 0 },
    { libelle: 'Dédouanement et transit', categorie: 'DOUANE', montant: 0 },
    { libelle: "Transport jusqu'à destination finale", categorie: 'LOGISTIQUE', montant: 0 },
    { libelle: 'Commission Alpha Import', categorie: 'COMMISSION', montant: 0 },
  )
  return lignes
}

export interface TotauxFacture {
  total: number
  commission: number
  acompte: number
  solde: number
  parCategorie: Record<Categorie, number>
}

/** Total, commission et répartition acompte / solde (60 / 40 par défaut, celle du bon de commande). */
export function totauxFacture(lignes: LigneFacture[], pourcentageAcompte = 60): TotauxFacture {
  const parCategorie = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Categorie, number>
  for (const l of lignes) parCategorie[l.categorie] = arrondi(parCategorie[l.categorie] + Number(l.montant || 0))
  const total = arrondi(Object.values(parCategorie).reduce((s, v) => s + v, 0))
  const acompte = arrondi((total * pourcentageAcompte) / 100)
  return { total, commission: parCategorie.COMMISSION, acompte, solde: arrondi(total - acompte), parCategorie }
}

export function numeroFacture(numeroBonDeCommande: string): string {
  return `FAC-${numeroBonDeCommande}`
}

/** Motif de refus d'un jeu de lignes, ou null s'il est acceptable pour émission. */
export function motifRefusLignes(lignes: LigneFacture[]): string | null {
  if (lignes.length === 0) return 'La facture ne contient aucune ligne'
  if (!lignes.some((l) => l.categorie === 'MARCHANDISE' && l.montant > 0)) return 'La marchandise doit figurer sur la facture'
  if (totauxFacture(lignes).total <= 0) return 'Le total de la facture doit être positif'
  return null
}
