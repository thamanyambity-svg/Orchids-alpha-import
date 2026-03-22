/**
 * generateInvoiceFromCustoms — Génération automatique d'une facture douanière
 *
 * Préconditions : dossier non DRAFT, déclaration validée fiscalement,
 * pas de facture active, au moins une ligne fiscale, cohérence total taxes.
 */

'use server'

import { requireAdmin } from '@/lib/server-actions/admin-guard'
import { ok, fail, type ServerActionResult } from '@/lib/server-actions/result'
import { getRequestMeta } from '@/lib/server-actions/request-meta'

const TARIFF = {
  FILE_FEE_USD: 150,
  MGMT_RATE: 0.02,
  MGMT_MIN_USD: 200,
  MGMT_MAX_USD: 2_000,
  PAYMENT_DAYS: 30,
} as const

export interface GenerateInvoiceInput {
  customsFileId: string
  customDueDate?: string
  notes?: string
}

export interface GenerateInvoiceResult {
  invoiceId: string
  invoiceNumber: string
  totalUsd: number
}

function roundHalfUp(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function computeManagementFee(declaredValueUsd: number): number {
  const raw = roundHalfUp(declaredValueUsd * TARIFF.MGMT_RATE, 4)
  return Math.min(Math.max(raw, TARIFF.MGMT_MIN_USD), TARIFF.MGMT_MAX_USD)
}

function computeDueDate(override?: string): string {
  if (override) return new Date(override).toISOString()
  const d = new Date()
  d.setDate(d.getDate() + TARIFF.PAYMENT_DAYS)
  return d.toISOString()
}

type TaxLineRow = {
  id: string
  final_amount_usd: number
  tax_type_id: string
  customs_tax_types: { code: string; label: string } | null
}

export async function generateInvoiceFromCustoms(
  input: GenerateInvoiceInput
): Promise<ServerActionResult<GenerateInvoiceResult>> {
  const gate = await requireAdmin()
  if (!gate.success) return fail(gate.error)

  const { supabase, userId } = gate.data
  const meta = await getRequestMeta()

  type FileRow = {
    id: string
    status: string
    order_id: string
    assigned_partner_id: string | null
    country_code: string
  }

  const { data: file, error: fileError } = await supabase
    .from('customs_files')
    .select('id, status, order_id, assigned_partner_id, country_code')
    .eq('id', input.customsFileId)
    .single<FileRow>()

  if (fileError || !file) return fail('Dossier douanier introuvable.')

  if (file.status === 'DRAFT') {
    return fail('Impossible de facturer un dossier en brouillon.')
  }

  type DeclarationRow = {
    id: string
    declared_value_usd: number
    total_taxes_usd: number
    is_fiscal_validated: boolean
    declaration_number: string | null
  }

  const { data: declaration, error: declError } = await supabase
    .from('customs_declarations')
    .select(
      'id, declared_value_usd, total_taxes_usd, is_fiscal_validated, declaration_number'
    )
    .eq('customs_file_id', input.customsFileId)
    .single<DeclarationRow>()

  if (declError || !declaration) {
    return fail(
      'Aucune déclaration douanière trouvée. ' +
        'Créez et validez la déclaration avant de facturer.'
    )
  }

  if (!declaration.is_fiscal_validated) {
    return fail(
      'La déclaration doit être validée fiscalement avant la facturation.'
    )
  }

  const { count: existingCount, error: dupError } = await supabase
    .from('customs_invoices')
    .select('id', { count: 'exact', head: true })
    .eq('customs_file_id', input.customsFileId)
    .neq('status', 'CANCELLED')

  if (dupError) return fail('Vérification doublons impossible.')

  if (existingCount && existingCount > 0) {
    return fail(
      'Une facture active existe déjà pour ce dossier. ' +
        "Annulez-la avant d'en générer une nouvelle."
    )
  }

  const { data: taxLines, error: linesError } = await supabase
    .from('customs_tax_lines')
    .select(
      'id, final_amount_usd, tax_type_id, customs_tax_types!inner(code, label)'
    )
    .eq('declaration_id', declaration.id)
    .order('id')

  if (linesError) return fail('Impossible de charger les lignes fiscales.')

  if (!taxLines || taxLines.length === 0) {
    return fail(
      'Aucune ligne fiscale saisie. ' + 'Ajoutez les taxes avant de générer la facture.'
    )
  }

  const lines = taxLines as unknown as TaxLineRow[]

  const disbursementTotal = roundHalfUp(
    lines.reduce((sum, l) => sum + Number(l.final_amount_usd ?? 0), 0),
    4
  )

  const declTotal = Number(declaration.total_taxes_usd)
  const gap = Math.abs(disbursementTotal - declTotal)
  if (gap > 0.005) {
    return fail(
      `Incohérence détectée : somme des taxes (${disbursementTotal} USD) ≠ ` +
        `total_taxes_usd déclaré (${declTotal} USD). ` +
        'Recalculez le total ou corrigez les lignes.'
    )
  }

  const declaredVal = Number(declaration.declared_value_usd)
  const fileFee = TARIFF.FILE_FEE_USD
  const mgmtFee = computeManagementFee(declaredVal)

  const { data: rateRow } = await supabase
    .from('exchange_rates')
    .select('id, rate, to_currency')
    .eq('from_currency', 'USD')
    .eq('to_currency', 'CDF')
    .is('superseded_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const exchangeRateId = rateRow?.id ?? null
  const exchangeRate = rateRow?.rate != null ? Number(rateRow.rate) : null
  const currencyLocal = rateRow?.to_currency ?? 'CDF'

  const totalUsd = roundHalfUp(disbursementTotal + fileFee + mgmtFee, 4)
  const totalLocal =
    exchangeRate != null && !Number.isNaN(exchangeRate)
      ? roundHalfUp(totalUsd * exchangeRate, 2)
      : null

  const snapshot = {
    customs_file_id: file.id,
    file_status: file.status,
    country_code: file.country_code,
    declaration_number: declaration.declaration_number,
    declared_value_usd: declaredVal,
    total_taxes_usd: declTotal,
    generated_at: new Date().toISOString(),
    generated_by: userId,
    ip_address: meta.ip,
    tariff_applied: {
      file_fee_usd: fileFee,
      mgmt_rate: TARIFF.MGMT_RATE,
      mgmt_min_usd: TARIFF.MGMT_MIN_USD,
      mgmt_max_usd: TARIFF.MGMT_MAX_USD,
    },
  }

  type OrderRow = { id: string; request_id: string }
  type RequestRow = { id: string; buyer_id: string }

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, request_id')
    .eq('id', file.order_id)
    .single<OrderRow>()

  if (orderErr || !order) return fail('Commande liée introuvable.')

  const { data: importRequest, error: reqErr } = await supabase
    .from('import_requests')
    .select('id, buyer_id')
    .eq('id', order.request_id)
    .single<RequestRow>()

  if (reqErr || !importRequest) return fail("Demande d'import introuvable.")

  const { data: invoiceNumberRaw, error: numError } =
    await supabase.rpc('generate_invoice_number')

  if (numError) {
    return fail("Impossible de générer le numéro de facture.")
  }

  const invoiceNumber =
    typeof invoiceNumberRaw === 'string'
      ? invoiceNumberRaw
      : invoiceNumberRaw != null
        ? String(invoiceNumberRaw)
        : null

  if (!invoiceNumber) {
    return fail("Impossible de générer le numéro de facture.")
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from('customs_invoices')
    .insert({
      customs_file_id: file.id,
      invoice_number: invoiceNumber,
      status: 'DRAFT',
      billed_to_user_id: importRequest.buyer_id,
      subtotal_disbursements_usd: disbursementTotal,
      subtotal_fees_usd: roundHalfUp(fileFee + mgmtFee, 4),
      total_usd: totalUsd,
      exchange_rate_id: exchangeRateId,
      total_local: totalLocal,
      currency_local: currencyLocal,
      issued_at: new Date().toISOString(),
      due_date: computeDueDate(input.customDueDate),
      generated_by: userId,
      notes: input.notes ?? null,
      snapshot_json: snapshot,
    })
    .select('id, invoice_number')
    .single()

  if (invoiceError || !invoice) {
    return fail(
      'Échec de la création de la facture. ' + (invoiceError?.message ?? '')
    )
  }

  const disbursementItems = lines.map((line, index) => ({
    invoice_id: invoice.id,
    item_type: 'DISBURSEMENT' as const,
    label: line.customs_tax_types
      ? `${line.customs_tax_types.code} — ${line.customs_tax_types.label}`
      : 'Taxe douanière',
    tax_line_id: line.id,
    quantity: 1,
    unit_price_usd: roundHalfUp(Number(line.final_amount_usd), 4),
    line_total_usd: roundHalfUp(Number(line.final_amount_usd), 4),
    sort_order: index,
  }))

  const feeItems = [
    {
      invoice_id: invoice.id,
      item_type: 'FILE_FEE' as const,
      label: 'Frais de dossier douanier — Alpha Import',
      tax_line_id: null as string | null,
      quantity: 1,
      unit_price_usd: fileFee,
      line_total_usd: roundHalfUp(fileFee, 4),
      sort_order: disbursementItems.length,
    },
    {
      invoice_id: invoice.id,
      item_type: 'SERVICE_FEE' as const,
      label:
        `Honoraires de gestion (${TARIFF.MGMT_RATE * 100} % — ` +
        `min ${TARIFF.MGMT_MIN_USD} USD / max ${TARIFF.MGMT_MAX_USD} USD)`,
      tax_line_id: null as string | null,
      quantity: 1,
      unit_price_usd: mgmtFee,
      line_total_usd: roundHalfUp(mgmtFee, 4),
      sort_order: disbursementItems.length + 1,
    },
  ]

  const { error: itemsError } = await supabase
    .from('invoice_items')
    .insert([...disbursementItems, ...feeItems])

  if (itemsError) {
    await supabase.from('customs_invoices').delete().eq('id', invoice.id)

    return fail(
      "Échec de l'insertion des lignes de facture. " +
        'La facture a été annulée automatiquement.'
    )
  }

  return ok({
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number,
    totalUsd,
  })
}
