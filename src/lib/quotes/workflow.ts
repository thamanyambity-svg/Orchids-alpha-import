/**
 * Circulation d'une pro forma.
 *
 *   partenaire prépare ──► DRAFT ──(admin valide)──► SUBMITTED ──(client accepte)──► ACCEPTED
 *                            │                          │                              └─► bon de commande
 *                            │                          └──(client demande révision)──► REVISED
 *                            └──(admin renvoie)──► REJECTED
 *
 * DRAFT et REJECTED ne quittent jamais l'équipe (partenaire + administration) :
 * le client ne voit une pro forma qu'une fois validée, c'est-à-dire dès que
 * `submitted_at` est posé. Une version validée remplace la précédente encore
 * en attente de réponse, qui passe en REVISED.
 */

export type StatutProForma = 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'REVISED'
export type Decision = 'approve' | 'return' | 'accept' | 'revise'

export interface RegleDecision {
  /** Qui décide. */
  role: 'ADMIN' | 'BUYER'
  /** Statuts à partir desquels la décision est possible. */
  depuis: StatutProForma[]
  vers: StatutProForma
  /** Un motif écrit est exigé. */
  motif: boolean
}

export const REGLES: Record<Decision, RegleDecision> = {
  approve: { role: 'ADMIN', depuis: ['DRAFT'], vers: 'SUBMITTED', motif: false },
  return: { role: 'ADMIN', depuis: ['DRAFT'], vers: 'REJECTED', motif: true },
  accept: { role: 'BUYER', depuis: ['SUBMITTED'], vers: 'ACCEPTED', motif: false },
  // Une pro forma expirée ne s'accepte plus, mais on peut toujours en demander une nouvelle.
  revise: { role: 'BUYER', depuis: ['SUBMITTED', 'EXPIRED'], vers: 'REVISED', motif: true },
}

export const MOTIF_MIN = 3
export const MOTIF_MAX = 1000

export const CHAMPS_FRAIS = [
  'freight_cost_usd',
  'insurance_cost_usd',
  'customs_duty_estimate_usd',
  'inspection_cost_usd',
  'handling_fees_usd',
  'other_fees_usd',
] as const

const arrondi = (n: number) => Math.round(n * 100) / 100

/** Même calcul que les colonnes générées par la base : sert à l'affichage et au contrôle. */
export function totaux(q: Record<string, unknown>) {
  const sousTotal = arrondi(Number(q.unit_price_usd ?? 0) * Number(q.quantity ?? 0))
  const frais = arrondi(CHAMPS_FRAIS.reduce((s, c) => s + Number(q[c] ?? 0), 0))
  return { subtotal_usd: sousTotal, total_fees_usd: frais, grand_total_usd: arrondi(sousTotal + frais) }
}

export function visiblePourAcheteur(q: { submitted_at?: string | null }): boolean {
  return Boolean(q.submitted_at)
}

/** Date de fin de validité (AAAA-MM-JJ), comptée à partir de la transmission au client. */
export function dateValidite(depuis: Date, jours: number): string {
  const d = new Date(depuis.getTime())
  d.setUTCDate(d.getUTCDate() + Math.max(1, Math.round(jours || 30)))
  return d.toISOString().slice(0, 10)
}

export function estExpiree(q: { valid_until?: string | null }, maintenant: Date = new Date()): boolean {
  if (!q.valid_until) return false
  return q.valid_until < maintenant.toISOString().slice(0, 10)
}

export function formatMontant(n: unknown, devise = 'USD'): string {
  const v = Number(n ?? 0)
  return `${v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${devise}`
}

export function dateFr(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [a, m, j] = iso.slice(0, 10).split('-')
  return `${j}/${m}/${a}`
}
