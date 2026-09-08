/**
 * Registre canonique des statuts métier.
 *
 * Avant ce fichier, les mêmes statuts étaient redéfinis dans sept pages, avec
 * des libellés et des couleurs divergents : une demande EXECUTING s'affichait
 * en bleu côté acheteur et en violet côté partenaire, CLOSED se lisait
 * « Fermé » ici et « Terminé » là, et FROZEN n'avait aucune couleur associée.
 *
 * Une entrée par statut, un libellé, une tonalité. Les couleurs viennent de
 * `tone.ts`, donc du thème : aucune classe de couleur n'est écrite ici.
 */

import { tone, type Tone } from "@/lib/design/tone"

export interface StatusMeta {
  /** Libellé français, également utilisé comme repli de traduction. */
  label: string
  tone: Tone
}

export interface StatusRegistry {
  /** Espace de noms de la famille, utilisé pour bâtir la clef de traduction. */
  ns: string
  entries: Record<string, StatusMeta>
}

/**
 * Convention de tonalité, appliquée à toutes les familles de statuts :
 *   neutral — état dormant ou terminé sans enjeu (brouillon, fermé, gelé)
 *   info    — traitement en cours, rien n'est attendu de l'utilisateur
 *   brand   — étape validée par Alpha Import
 *   warning — une action est attendue de l'utilisateur
 *   success — étape aboutie
 *   danger  — échec, refus ou incident
 */

/** Cycle de vie d'une demande d'importation, et des commandes qui en découlent. */
export const REQUEST_STATUS: StatusRegistry = {
  ns: "request",
  entries: {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  PENDING: { label: "En attente", tone: "neutral" },
  ANALYSIS: { label: "En analyse", tone: "info" },
  VALIDATED: { label: "Validé", tone: "brand" },
  QUOTE_ACCEPTED: { label: "Devis accepté", tone: "brand" },
  REJECTED: { label: "Rejeté", tone: "danger" },
  AWAITING_DEPOSIT: { label: "Acompte requis", tone: "warning" },
  FUNDED: { label: "Financé", tone: "success" },
  SOURCING: { label: "En sourcing", tone: "info" },
  EXECUTING: { label: "En exécution", tone: "info" },
  PURCHASED: { label: "Acheté", tone: "info" },
  AWAITING_BALANCE: { label: "Solde requis", tone: "warning" },
  SHIPPED: { label: "Expédié", tone: "info" },
  DELIVERED: { label: "Livré", tone: "success" },
  CLOSED: { label: "Clôturé", tone: "neutral" },
  INCIDENT: { label: "Incident", tone: "danger" },
  FROZEN: { label: "Gelé", tone: "neutral" },
  CANCELLED: { label: "Annulé", tone: "danger" },
  },
}

/** Cycle de vie d'un devis partenaire. */
export const QUOTE_STATUS: StatusRegistry = {
  ns: "quote",
  entries: {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  SUBMITTED: { label: "Envoyé", tone: "info" },
  ACCEPTED: { label: "Accepté", tone: "success" },
  REJECTED: { label: "Rejeté", tone: "danger" },
  EXPIRED: { label: "Expiré", tone: "warning" },
  REVISED: { label: "Révisé", tone: "warning" },
  },
}

/** Cycle de vie d'un bon de commande. */
export const PURCHASE_ORDER_STATUS: StatusRegistry = {
  ns: "purchaseOrder",
  entries: {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  PENDING_SIGNATURE: { label: "En attente de signature", tone: "warning" },
  SIGNED: { label: "Signé", tone: "info" },
  CONFIRMED: { label: "Confirmé", tone: "success" },
  CANCELLED: { label: "Annulé", tone: "danger" },
  },
}

/** Cycle de vie d'une facture. */
export const INVOICE_STATUS: StatusRegistry = {
  ns: "invoice",
  entries: {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  SENT: { label: "Envoyée", tone: "info" },
  PAID: { label: "Payée", tone: "success" },
  OVERDUE: { label: "En retard", tone: "danger" },
  CANCELLED: { label: "Annulée", tone: "neutral" },
  },
}

/** Cycle de vie d'une preuve de paiement soumise par un acheteur. */
export const PAYMENT_PROOF_STATUS: StatusRegistry = {
  ns: "paymentProof",
  entries: {
  PENDING_REVIEW: { label: "À vérifier", tone: "warning" },
  ACCEPTED: { label: "Acceptée", tone: "success" },
  REJECTED: { label: "Rejetée", tone: "danger" },
  SUPERSEDED: { label: "Remplacée", tone: "neutral" },
  },
}

const FALLBACK: StatusMeta = { label: "Inconnu", tone: "neutral" }

/** Clef de traduction d'un statut, unique pour toute l'application. */
export function statusKey(registry: StatusRegistry, status: string): string {
  return `status.${registry.ns}.${status}`
}

/**
 * Métadonnées d'un statut. Un statut absent du registre retombe sur une
 * tonalité neutre et son propre code plutôt que de perdre tout style, ce qui
 * arrivait avec FROZEN et CANCELLED dans les pages de commandes.
 */
export function statusMeta(registry: StatusRegistry, status: string | null | undefined): StatusMeta {
  if (!status) return FALLBACK
  return registry.entries[status] ?? { label: status, tone: FALLBACK.tone }
}

/**
 * Libellé d'un statut, traduit si un traducteur est fourni.
 *
 * Les neuf points d'affichage utilisaient auparavant trois préfixes de clef
 * différents, et quatre d'entre eux n'appelaient pas la traduction du tout.
 * Passer le `t` du contexte de langue ici suffit désormais.
 */
export function statusLabel(
  registry: StatusRegistry,
  status: string | null | undefined,
  t?: (key: string, fallback?: string) => string
): string {
  const meta = statusMeta(registry, status)
  if (!t || !status) return meta.label
  return t(statusKey(registry, status), meta.label)
}

/** Classes de pastille d'un statut, issues du thème. */
export function statusBadge(registry: StatusRegistry, status: string | null | undefined): string {
  return tone(statusMeta(registry, status).tone).badge
}
