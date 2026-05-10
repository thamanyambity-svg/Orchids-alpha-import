/**
 * Libellés et classes UI partagés pour les statuts métier (demande + commande).
 */

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  PENDING: 'En attente',
  ANALYSIS: 'En analyse',
  VALIDATED: 'Validée',
  REJECTED: 'Refusée',
  AWAITING_DEPOSIT: 'Attente acompte (60 %)',
  AWAITING_BALANCE: 'Attente solde (40 %)',
  EXECUTING: 'En cours d’exécution',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  INCIDENT: 'Incident',
  CLOSED: 'Clôturée',
  CANCELLED: 'Annulée',
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente de validation client',
  AWAITING_DEPOSIT: 'Attente paiement acompte',
  FUNDED: 'Acompte reçu — sourcing',
  SOURCING: 'Sourcing / achat en cours',
  EXECUTING: 'Exécution',
  PURCHASED: 'Marchandises achetées',
  AWAITING_BALANCE: 'Attente solde final',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée (entrepôt / RDC)',
  CLOSED: 'Clôturée',
  INCIDENT: 'Incident',
  FROZEN: 'Gelée',
  CANCELLED: 'Annulée',
}

export function requestStatusLabel(status: string | undefined | null): string {
  if (!status) return '—'
  return REQUEST_STATUS_LABELS[status] ?? status
}

export function orderStatusLabel(status: string | undefined | null): string {
  if (!status) return '—'
  return ORDER_STATUS_LABELS[status] ?? status
}

/** Classes Tailwind pour pastille statut demande */
export const REQUEST_STATUS_BADGE_CLASS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  PENDING: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  ANALYSIS: 'bg-primary/15 text-primary',
  VALIDATED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  REJECTED: 'bg-destructive/15 text-destructive',
  AWAITING_DEPOSIT: 'bg-orange-500/15 text-orange-800 dark:text-orange-300',
  AWAITING_BALANCE: 'bg-violet-500/15 text-violet-800 dark:text-violet-300',
  EXECUTING: 'bg-sky-500/15 text-sky-800 dark:text-sky-300',
  SHIPPED: 'bg-blue-500/15 text-blue-800 dark:text-blue-300',
  DELIVERED: 'bg-teal-500/15 text-teal-800 dark:text-teal-300',
  INCIDENT: 'bg-destructive/20 text-destructive',
  CLOSED: 'bg-muted text-muted-foreground',
  CANCELLED: 'bg-muted text-muted-foreground',
}

/** Classes Tailwind pour pastille statut commande */
export const ORDER_STATUS_BADGE_CLASS: Record<string, string> = {
  PENDING: 'bg-muted text-muted-foreground',
  AWAITING_DEPOSIT: 'bg-orange-500/15 text-orange-800 dark:text-orange-300',
  FUNDED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  SOURCING: 'bg-primary/15 text-primary',
  EXECUTING: 'bg-sky-500/15 text-sky-800 dark:text-sky-300',
  PURCHASED: 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-300',
  AWAITING_BALANCE: 'bg-violet-500/15 text-violet-800 dark:text-violet-300',
  SHIPPED: 'bg-blue-500/15 text-blue-800 dark:text-blue-300',
  DELIVERED: 'bg-teal-500/15 text-teal-800 dark:text-teal-300',
  CLOSED: 'bg-muted text-muted-foreground',
  INCIDENT: 'bg-destructive/20 text-destructive',
  FROZEN: 'bg-amber-500/20 text-amber-900 dark:text-amber-200',
  CANCELLED: 'bg-muted text-muted-foreground',
}

export function requestStatusBadgeClass(status: string): string {
  return REQUEST_STATUS_BADGE_CLASS[status] ?? 'bg-muted text-muted-foreground'
}

export function orderStatusBadgeClass(status: string): string {
  return ORDER_STATUS_BADGE_CLASS[status] ?? 'bg-muted text-muted-foreground'
}

/** Types de documents attendus pour une check-list (codes pays ISO2). */
export const DOCUMENT_CHECKLIST_TYPES = [
  'PROFORMA_INVOICE',
  'COMMERCIAL_INVOICE',
  'PACKING_LIST',
  'BILL_OF_LADING',
  'CERTIFICATE_ORIGIN',
  'INSPECTION_REPORT',
] as const

export type ChecklistDocType = (typeof DOCUMENT_CHECKLIST_TYPES)[number]

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  PROFORMA_INVOICE: 'Facture proforma',
  COMMERCIAL_INVOICE: 'Facture commerciale',
  PACKING_LIST: 'Packing list',
  INSPECTION_REPORT: "Rapport d'inspection",
  BILL_OF_LADING: 'Bill of lading / LTA',
  CERTIFICATE_ORIGIN: "Certificat d'origine",
  PAYMENT_RECEIPT: 'Reçu de paiement (Alpha)',
  COMPLIANCE_REPORT: 'Rapport de conformité (Alpha)',
  OTHER: 'Autre',
}

const DEFAULT_CHECKLIST: ChecklistDocType[] = [...DOCUMENT_CHECKLIST_TYPES]

/** Surcharges par pays d’achat ; à enrichir sans migration. */
const BY_COUNTRY: Record<string, ChecklistDocType[]> = {
  CN: [
    'PROFORMA_INVOICE',
    'COMMERCIAL_INVOICE',
    'PACKING_LIST',
    'BILL_OF_LADING',
    'CERTIFICATE_ORIGIN',
  ],
  AE: [
    'PROFORMA_INVOICE',
    'COMMERCIAL_INVOICE',
    'PACKING_LIST',
    'BILL_OF_LADING',
  ],
  TR: [
    'PROFORMA_INVOICE',
    'COMMERCIAL_INVOICE',
    'PACKING_LIST',
    'BILL_OF_LADING',
    'CERTIFICATE_ORIGIN',
  ],
  TH: [
    'PROFORMA_INVOICE',
    'COMMERCIAL_INVOICE',
    'PACKING_LIST',
    'BILL_OF_LADING',
  ],
  JP: [
    'PROFORMA_INVOICE',
    'COMMERCIAL_INVOICE',
    'PACKING_LIST',
    'BILL_OF_LADING',
    'CERTIFICATE_ORIGIN',
  ],
}

export function expectedDocumentsForCountry(
  countryCode: string | null | undefined
): ChecklistDocType[] {
  if (!countryCode) return DEFAULT_CHECKLIST
  const code = countryCode.trim().toUpperCase()
  return BY_COUNTRY[code] ?? DEFAULT_CHECKLIST
}
