/**
 * Données du dashboard financier admin — filtre sur customs_invoices.issued_at
 */

'use server'

import { requireAdmin } from '@/lib/server-actions/admin-guard'
import { ok, fail } from '@/lib/server-actions/result'
import type { ServerActionResult } from '@/lib/server-actions/result'
import {
  computeDateRange,
  type PeriodFilter,
  type PeriodPreset,
} from '@/lib/finance/period-range'

export interface DossierStatusCount {
  status: string
  count: number
}

export interface InvoiceRow {
  id: string
  invoice_number: string
  status: string
  issued_at: string
  due_date: string
  buyer_name: string | null
  total_usd: number
  total_local: number | null
  currency_local: string
  subtotal_disbursements_usd: number
  subtotal_fees_usd: number
  customs_file_id: string
}

export interface FinanceDashboardData {
  date_from: string
  date_to: string
  total_facture_usd: number
  total_encaisse_usd: number
  total_en_attente_usd: number
  total_facture_cdf: number | null
  total_debours_usd: number
  total_honoraires_usd: number
  dossiers_par_statut: DossierStatusCount[]
  invoices: InvoiceRow[]
  exchange_rate: number | null
}

type RawInvoice = {
  id: string
  invoice_number: string
  status: string
  issued_at: string
  due_date: string
  total_usd: number
  total_local: number | null
  currency_local: string | null
  subtotal_disbursements_usd: number
  subtotal_fees_usd: number
  customs_file_id: string
  billed_to_user_id: string
}

export async function getFinanceDashboardData(
  filter: PeriodFilter
): Promise<ServerActionResult<FinanceDashboardData>> {
  const adminGate = await requireAdmin()
  if (!adminGate.success) return fail(adminGate.error)

  const supabase = adminGate.data.supabase
  const { dateFrom, dateTo } = computeDateRange(filter)

  const { data: rawInvoices, error: invError } = await supabase
    .from('customs_invoices')
    .select(
      'id, invoice_number, status, issued_at, due_date, ' +
        'total_usd, total_local, currency_local, ' +
        'subtotal_disbursements_usd, subtotal_fees_usd, ' +
        'customs_file_id, billed_to_user_id'
    )
    .gte('issued_at', dateFrom)
    .lte('issued_at', dateTo)
    .not('status', 'eq', 'CANCELLED')
    .order('issued_at', { ascending: false })

  if (invError) {
    console.error('[getFinanceDashboardData] invoices', invError)
    return fail('Impossible de charger les factures.')
  }

  const rows = (rawInvoices ?? []) as unknown as RawInvoice[]
  const buyerIds = [...new Set(rows.map((r) => r.billed_to_user_id))]

  const nameById = new Map<string, string | null>()
  if (buyerIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', buyerIds)
    for (const p of profs ?? []) {
      nameById.set(p.id, p.full_name ?? null)
    }
  }

  const invoices: InvoiceRow[] = rows.map((inv) => ({
    id: inv.id,
    invoice_number: inv.invoice_number,
    status: inv.status,
    issued_at: inv.issued_at,
    due_date: inv.due_date,
    buyer_name: nameById.get(inv.billed_to_user_id) ?? null,
    total_usd: Number(inv.total_usd),
    total_local: inv.total_local != null ? Number(inv.total_local) : null,
    currency_local: inv.currency_local ?? 'CDF',
    subtotal_disbursements_usd: Number(inv.subtotal_disbursements_usd),
    subtotal_fees_usd: Number(inv.subtotal_fees_usd),
    customs_file_id: inv.customs_file_id,
  }))

  const totalFactureUsd = invoices.reduce((s, i) => s + i.total_usd, 0)
  const totalEncaisseUsd = invoices
    .filter((i) => i.status === 'PAID')
    .reduce((s, i) => s + i.total_usd, 0)
  const totalEnAttenteUsd = invoices
    .filter((i) => i.status === 'SENT')
    .reduce((s, i) => s + i.total_usd, 0)
  const totalDebours = invoices.reduce((s, i) => s + i.subtotal_disbursements_usd, 0)
  const totalHonoraires = invoices.reduce((s, i) => s + i.subtotal_fees_usd, 0)

  const hasCdf = invoices.some((i) => i.total_local != null && i.currency_local === 'CDF')
  const totalFactureCdf = hasCdf
    ? invoices
        .filter((i) => i.total_local != null && i.currency_local === 'CDF')
        .reduce((s, i) => s + (i.total_local ?? 0), 0)
    : null

  const { data: filesRaw } = await supabase.from('customs_files').select('status')

  const statusMap: Record<string, number> = {}
  for (const f of (filesRaw ?? []) as { status: string }[]) {
    statusMap[f.status] = (statusMap[f.status] ?? 0) + 1
  }
  const dossiersByStatus: DossierStatusCount[] = Object.entries(statusMap)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)

  const { data: rateRow } = await supabase
    .from('exchange_rates')
    .select('rate')
    .eq('from_currency', 'USD')
    .eq('to_currency', 'CDF')
    .is('superseded_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ rate: number }>()

  const exchangeRate = rateRow?.rate != null ? Number(rateRow.rate) : null

  return ok({
    date_from: dateFrom,
    date_to: dateTo,
    total_facture_usd: Math.round(totalFactureUsd * 100) / 100,
    total_encaisse_usd: Math.round(totalEncaisseUsd * 100) / 100,
    total_en_attente_usd: Math.round(totalEnAttenteUsd * 100) / 100,
    total_facture_cdf: totalFactureCdf != null ? Math.round(totalFactureCdf) : null,
    total_debours_usd: Math.round(totalDebours * 100) / 100,
    total_honoraires_usd: Math.round(totalHonoraires * 100) / 100,
    dossiers_par_statut: dossiersByStatus,
    invoices,
    exchange_rate: exchangeRate,
  })
}
