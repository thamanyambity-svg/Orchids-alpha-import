/**
 * Types partagés — template PDF facture & route d’export.
 */

export interface InvoicePdfLineItem {
  label: string
  quantity: number
  unit_price_usd: number
  line_total_usd: number
  item_type: string
}

export interface InvoicePdfData {
  invoice_number: string
  issued_at: string
  due_date: string
  status: string
  buyer_name: string | null
  buyer_email: string | null
  transport_mode: string | null
  transport_ref: string | null
  declaration_number: string | null
  country_code: string
  items: InvoicePdfLineItem[]
  subtotal_disbursements_usd: number
  subtotal_fees_usd: number
  total_usd: number
  total_local: number | null
  currency_local: string
  exchange_rate: number | null
  customs_file_id: string
  generated_at: string
}

export const COMPANY_INFO = {
  name: 'Alpha Import Exchange',
  subtitle: 'Une filiale du Groupe A.Onoseke House Investment RDC',
  address: 'Kinshasa, République Démocratique du Congo',
  email: 'contact@aonosekehouseinvestmentdrc.site',
  rccm: 'CD/KIN/RCCM/XX-XXXXX',
  id_nat: 'XX-XXXXX-XXXXXXX',
  bank: 'Rawbank — IBAN CD XX XXXX XXXX XXXX XXXX XXXX XXXX',
} as const

export const CURRENCY_LABELS: Record<string, string> = {
  CDF: 'Francs Congolais',
  USD: 'Dollars Américains',
  EUR: 'Euros',
}
