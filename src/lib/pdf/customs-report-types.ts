/**
 * Types — rapport douanier PDF (document DGDA), distinct de la facture.
 */

export interface ReportStatusEntry {
  status_from: string | null
  status_to: string
  reason: string | null
  changed_at: string
  changer_name: string | null
}

export interface ReportTaxLine {
  tax_code: string
  tax_label: string
  base_amount_usd: number
  rate_percent: number | null
  final_amount_usd: number
}

export interface CustomsReportData {
  customs_file_id: string
  file_ref: string
  status: string
  country_code: string
  generated_at: string
  transport_mode: string | null
  transport_ref: string | null
  vessel_flight_name: string | null
  container_number: string | null
  order_ref: string | null
  buyer_name: string | null
  buyer_email: string | null
  declaration_number: string | null
  declared_value_usd: number | null
  total_taxes_usd: number | null
  is_fiscal_validated: boolean
  fiscal_validated_by: string | null
  fiscal_validated_at: string | null
  is_accounting_validated: boolean
  accounting_validated_by: string | null
  accounting_validated_at: string | null
  tax_lines: ReportTaxLine[]
  status_history: ReportStatusEntry[]
  file_created_at: string
  file_updated_at: string
}

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  PRE_ADVICE: 'Pré-alerte envoyée',
  IN_CUSTOMS: 'En cours de dédouanement',
  LIQUIDATED: 'Liquidé',
  PAID: 'Taxes réglées',
  RELEASED: 'Marchandise libérée',
  BLOCKED: 'Bloqué',
}

export const TRANSPORT_LABELS: Record<string, string> = {
  AIR: 'Transport aérien',
  SEA: 'Transport maritime',
  LAND: 'Transport terrestre',
}

export const TRANSPORT_REF_LABELS: Record<string, string> = {
  AIR: 'N° LTA (Lettre de Transport Aérien)',
  SEA: 'N° Connaissement (Bill of Lading)',
  LAND: 'N° Lettre de voiture CMR',
}
