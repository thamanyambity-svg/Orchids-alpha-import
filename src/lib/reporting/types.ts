/**
 * Reporting & Audit — Alpha Import Exchange
 * Source of truth: Alpha_Import_Exchange_Reporting_Audit.xlsx
 */

import { z } from "zod"

// ── ENUMS ──────────────────────────────────────────────────────────────────────

export type Incoterm = "FOB" | "CIF" | "EXW" | "DDP" | "DAP" | "CFR"

export type Currency = "USD" | "EUR" | "AED" | "CNY" | "CDF"

export type PaymentStatus =
  | "Payé"
  | "En attente"
  | "Partiellement payé"
  | "Annulé"

export type WorkflowStep =
  | "Assignation"
  | "Validation"
  | "Exécution"
  | "En transit"
  | "Dédouanement"
  | "Livraison"
  | "Clôturé"

export type Priority = "Normal" | "Urgent" | "Critique"

export type UserRole = "ADMIN" | "CLIENT"

// ── MAIN INTERFACE ─────────────────────────────────────────────────────────────

/**
 * Représente une opération commerciale complète.
 * Source of truth: Alpha_Import_Exchange_Reporting_Audit.xlsx
 */
export interface Transaction {
  // ── BLOC 1 : IDENTIFICATION & TRAÇABILITÉ ────────────────────────────────
  uid: string                 // Format strict : "AI-YYYY-TR-NNN" (ex: "AI-2026-TR-001")
  clientReference: string     // Nom légal de l'entité cliente
  isoTimestamp: string        // ISO 8601 UTC strict : "YYYY-MM-DDTHH:MM:SSZ"

  // ── BLOC 2 : ORIGINE & DESTINATION (MULTIMODAL) ──────────────────────────
  pol: string                 // Point of Loading  — "Ville, Pays"
  pod: string                 // Point of Discharge — "Ville, Pays"
  incoterm: Incoterm          // Règle de commerce internationale

  // ── BLOC 3 : FINANCIER ───────────────────────────────────────────────────
  valueFOB: number            // Prix d'achat fournisseur en USD (HT)
  alphaCommission: number     // Commission plateforme en USD
  totalValue: number          // CALCULÉ : valueFOB + alphaCommission
  deposit60: number           // CALCULÉ : totalValue * 0.60 (acompte)
  balance40: number           // CALCULÉ : totalValue * 0.40 (solde)
  currency: Currency          // Toujours "USD" par défaut
  depositStatus: PaymentStatus
  balanceStatus: PaymentStatus

  // ── BLOC 4 : OPÉRATIONNEL (WORKFLOW) ─────────────────────────────────────
  currentStep: WorkflowStep
  responsibleAgent: string    // Prénom Nom de l'agent Alpha Import
  trackingNumber: string      // URL cliquable ou identifiant transporteur

  // ── BLOC 5 : RISQUES & ALERTES ───────────────────────────────────────────
  priority: Priority
  incidentLog: string         // Texte libre — résumé des blocages

  // ── MÉTA ─────────────────────────────────────────────────────────────────
  clientVisible: boolean      // true = inclus dans la vue CLIENT
}

// ── CLIENT VIEW ───────────────────────────────────────────────────────────────

/**
 * Champs EXCLUS de la vue client (données sensibles internes).
 * Ne jamais exposer ces champs dans les endpoints /client/*
 */
export const CLIENT_HIDDEN_FIELDS: (keyof Transaction)[] = [
  "valueFOB",
  "alphaCommission",
  "responsibleAgent",
  "clientVisible",
]

export type ClientTransaction = Omit<
  Transaction,
  "valueFOB" | "alphaCommission" | "responsibleAgent" | "clientVisible"
>

export function toClientView(tx: Transaction): ClientTransaction | null {
  if (!tx.clientVisible) return null
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { valueFOB, alphaCommission, responsibleAgent, clientVisible, ...clientTx } = tx
  return clientTx
}

// ── FINANCIAL COMPUTATIONS ───────────────────────────────────────────────────

export function computeFinancials(
  valueFOB: number,
  commissionRate: number,
): {
  alphaCommission: number
  totalValue: number
  deposit60: number
  balance40: number
} {
  const alphaCommission = valueFOB * commissionRate
  const totalValue = valueFOB + alphaCommission
  const deposit60 = totalValue * 0.6
  const balance40 = totalValue * 0.4
  return { alphaCommission, totalValue, deposit60, balance40 }
}

// ── UID HELPERS ───────────────────────────────────────────────────────────────

export const UID_REGEX = /^AI-\d{4}-TR-\d{3}$/

export function generateUID(year: number, sequence: number): string {
  const seq = String(sequence).padStart(3, "0")
  return `AI-${year}-TR-${seq}`
}

export function validateUID(uid: string): boolean {
  return UID_REGEX.test(uid)
}

// ── COLOUR PALETTE ────────────────────────────────────────────────────────────

export const ALPHA_COLORS = {
  NAVY:      "#1B2A4A",
  GOLD:      "#C9A84C",
  WHITE:     "#FFFFFF",
  GREY_ROW:  "#EAF0FB",
  RED_ALERT: "#C0392B",
  ORANGE:    "#E67E22",
  GREEN_OK:  "#1E8449",
  DARK_TEXT: "#1B2A4A",
} as const

// ── COLUMN ORDER ──────────────────────────────────────────────────────────────

export const ADMIN_COLUMNS = [
  "uid", "clientReference", "isoTimestamp",
  "pol", "pod", "incoterm",
  "valueFOB", "alphaCommission", "totalValue", "deposit60", "balance40",
  "currentStep", "responsibleAgent", "trackingNumber",
  "priority", "incidentLog", "depositStatus", "balanceStatus",
  "currency", "clientVisible",
] as const

export const CLIENT_COLUMNS = [
  "uid", "clientReference", "isoTimestamp",
  "pol", "pod", "incoterm",
  "totalValue", "deposit60", "balance40",
  "currentStep", "trackingNumber",
  "priority", "incidentLog", "depositStatus", "balanceStatus",
  "currency",
] as const

// ── ZOD SCHEMA ────────────────────────────────────────────────────────────────

export const TransactionSchema = z.object({
  uid:              z.string().regex(/^AI-\d{4}-TR-\d{3}$/, "Format UID invalide"),
  clientReference:  z.string().min(2).max(100),
  isoTimestamp:     z.string().datetime({ offset: false }),
  pol:              z.string().min(3),
  pod:              z.string().min(3),
  incoterm:         z.enum(["FOB", "CIF", "EXW", "DDP", "DAP", "CFR"]),
  valueFOB:         z.number().positive(),
  alphaCommission:  z.number().nonnegative(),
  totalValue:       z.number().positive(),
  deposit60:        z.number().nonnegative(),
  balance40:        z.number().nonnegative(),
  currency:         z.enum(["USD", "EUR", "AED", "CNY", "CDF"]).default("USD"),
  depositStatus:    z.enum(["Payé", "En attente", "Partiellement payé", "Annulé"]),
  balanceStatus:    z.enum(["Payé", "En attente", "Partiellement payé", "Annulé"]),
  currentStep:      z.enum(["Assignation", "Validation", "Exécution", "En transit", "Dédouanement", "Livraison", "Clôturé"]),
  responsibleAgent: z.string().min(2),
  trackingNumber:   z.string(),
  priority:         z.enum(["Normal", "Urgent", "Critique"]),
  incidentLog:      z.string().max(500).default("RAS"),
  clientVisible:    z.boolean().default(false),
})

export type TransactionInput = z.infer<typeof TransactionSchema>

// ── SEED DATA ─────────────────────────────────────────────────────────────────

export const SEED_TRANSACTIONS: Transaction[] = [
  {
    uid: "AI-2026-TR-001",
    clientReference: "Sino-Trade Ltd",
    isoTimestamp: "2026-03-28T08:00:00Z",
    pol: "Guangzhou, Chine",
    pod: "Kinshasa, RDC",
    incoterm: "FOB",
    valueFOB: 85000,
    alphaCommission: 8500,
    totalValue: 93500,
    deposit60: 56100,
    balance40: 37400,
    currency: "USD",
    depositStatus: "Payé",
    balanceStatus: "En attente",
    currentStep: "Exécution",
    responsibleAgent: "M. Tao Wei",
    trackingNumber: "https://track.maersk.com/TRK-001",
    priority: "Normal",
    incidentLog: "RAS",
    clientVisible: true,
  },
  {
    uid: "AI-2026-TR-002",
    clientReference: "Gulf Resources",
    isoTimestamp: "2026-03-28T09:15:00Z",
    pol: "Dubaï, EAU",
    pod: "Lubumbashi, RDC",
    incoterm: "CIF",
    valueFOB: 47000,
    alphaCommission: 4700,
    totalValue: 51700,
    deposit60: 31020,
    balance40: 20680,
    currency: "USD",
    depositStatus: "Payé",
    balanceStatus: "En attente",
    currentStep: "Validation",
    responsibleAgent: "Amara Diallo",
    trackingNumber: "https://track.dhl.com/TRK-002",
    priority: "Urgent",
    incidentLog: "Attente certificat phytosanitaire douane RDC",
    clientVisible: true,
  },
  {
    uid: "AI-2026-TR-004",
    clientReference: "Kinshasa Biz Group",
    isoTimestamp: "2026-03-26T11:00:00Z",
    pol: "Shanghai, Chine",
    pod: "Matadi, RDC",
    incoterm: "FOB",
    valueFOB: 33000,
    alphaCommission: 3300,
    totalValue: 36300,
    deposit60: 21780,
    balance40: 14520,
    currency: "USD",
    depositStatus: "En attente",
    balanceStatus: "En attente",
    currentStep: "Assignation",
    responsibleAgent: "M. Tao Wei",
    trackingNumber: "En attente d'attribution",
    priority: "Critique",
    incidentLog: "Blocage port Matadi – grève douanière",
    clientVisible: false,
  },
]
