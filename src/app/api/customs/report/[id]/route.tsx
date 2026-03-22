/**
 * GET /api/customs/report/[id] — PDF récap douanier (customs_files.id), ADMIN uniquement.
 */

import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { CustomsReportTemplate } from '@/components/pdf/customs-report-template'
import type { CustomsReportData, ReportStatusEntry, ReportTaxLine } from '@/lib/pdf/customs-report-types'

type CustomsFileRow = {
  id: string
  status: string
  transport_mode: string | null
  transport_ref: string | null
  vessel_flight_name: string | null
  container_number: string | null
  country_code: string
  order_id: string
  created_at: string
  updated_at: string
}

type DeclarationRow = {
  id: string
  declaration_number: string | null
  declared_value_usd: number
  total_taxes_usd: number
  is_fiscal_validated: boolean
  fiscal_validated_by: string | null
  fiscal_validated_at: string | null
  is_accounting_validated: boolean
  accounting_validated_by: string | null
  accounting_validated_at: string | null
}

type TaxLineRow = {
  base_amount_usd: number
  rate_percent: number | null
  final_amount_usd: number
  tax_type:
    | { code: string; label: string }
    | { code: string; label: string }[]
    | null
}

type HistoryRow = {
  status_from: string | null
  status_to: string
  reason: string | null
  changed_at: string
  changed_by: string
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: fileId } = await context.params

  if (!fileId) {
    return NextResponse.json({ error: 'Identifiant de dossier manquant.' }, { status: 400 })
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'ADMIN') {
    return NextResponse.json({ error: "Accès réservé à l'administration." }, { status: 403 })
  }

  const { data: file, error: fileError } = await supabase
    .from('customs_files')
    .select(
      'id, status, transport_mode, transport_ref, vessel_flight_name, container_number, ' +
        'country_code, order_id, created_at, updated_at'
    )
    .eq('id', fileId)
    .single<CustomsFileRow>()

  if (fileError || !file) {
    return NextResponse.json({ error: 'Dossier douanier introuvable.' }, { status: 404 })
  }

  const { data: order } = await supabase
    .from('orders')
    .select('id, reference, request_id')
    .eq('id', file.order_id)
    .maybeSingle<{ id: string; reference: string | null; request_id: string }>()

  const { data: request } = order
    ? await supabase
        .from('import_requests')
        .select('buyer_id')
        .eq('id', order.request_id)
        .maybeSingle<{ buyer_id: string }>()
    : { data: null }

  const { data: buyer } = request
    ? await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', request.buyer_id)
        .maybeSingle<{ full_name: string | null; email: string | null }>()
    : { data: null }

  const { data: declaration } = await supabase
    .from('customs_declarations')
    .select(
      'id, declaration_number, declared_value_usd, total_taxes_usd, ' +
        'is_fiscal_validated, fiscal_validated_by, fiscal_validated_at, ' +
        'is_accounting_validated, accounting_validated_by, accounting_validated_at'
    )
    .eq('customs_file_id', fileId)
    .maybeSingle<DeclarationRow>()

  async function resolveProfileName(userId: string | null): Promise<string | null> {
    if (!userId) return null
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle<{ full_name: string | null }>()
    return data?.full_name ?? null
  }

  const [fiscalValidatorName, accountingValidatorName] = await Promise.all([
    resolveProfileName(declaration?.fiscal_validated_by ?? null),
    resolveProfileName(declaration?.accounting_validated_by ?? null),
  ])

  const { data: taxLinesRaw } = declaration
    ? await supabase
        .from('customs_tax_lines')
        .select(
          'base_amount_usd, rate_percent, final_amount_usd, tax_type:customs_tax_types!tax_type_id (code, label)'
        )
        .eq('declaration_id', declaration.id)
        .order('id', { ascending: true })
    : { data: null }

  const taxLines: ReportTaxLine[] = (taxLinesRaw ?? []).map((l: TaxLineRow) => {
    const t = Array.isArray(l.tax_type) ? l.tax_type[0] : l.tax_type
    return {
      tax_code: t?.code ?? '—',
      tax_label: t?.label ?? '—',
      base_amount_usd: Number(l.base_amount_usd),
      rate_percent: l.rate_percent != null ? Number(l.rate_percent) : null,
      final_amount_usd: Number(l.final_amount_usd),
    }
  })

  const { data: historyRaw } = await supabase
    .from('customs_status_history')
    .select('status_from, status_to, reason, changed_at, changed_by')
    .eq('customs_file_id', fileId)
    .order('changed_at', { ascending: true })

  const statusHistory: ReportStatusEntry[] = await Promise.all(
    ((historyRaw ?? []) as HistoryRow[]).map(async (h) => ({
      status_from: h.status_from,
      status_to: h.status_to,
      reason: h.reason,
      changed_at: h.changed_at,
      changer_name: await resolveProfileName(h.changed_by),
    }))
  )

  const reportData: CustomsReportData = {
    customs_file_id: fileId,
    file_ref: fileId.slice(0, 8).toUpperCase(),
    status: file.status,
    country_code: file.country_code,
    generated_at: new Date().toISOString(),
    transport_mode: file.transport_mode,
    transport_ref: file.transport_ref,
    vessel_flight_name: file.vessel_flight_name,
    container_number: file.container_number,
    order_ref: order
      ? (order.reference ?? `${order.id.slice(0, 8).toUpperCase()}`)
      : null,
    buyer_name: buyer?.full_name ?? null,
    buyer_email: buyer?.email ?? null,
    declaration_number: declaration?.declaration_number ?? null,
    declared_value_usd: declaration != null ? Number(declaration.declared_value_usd) : null,
    total_taxes_usd: declaration != null ? Number(declaration.total_taxes_usd) : null,
    is_fiscal_validated: declaration?.is_fiscal_validated ?? false,
    fiscal_validated_by: fiscalValidatorName,
    fiscal_validated_at: declaration?.fiscal_validated_at ?? null,
    is_accounting_validated: declaration?.is_accounting_validated ?? false,
    accounting_validated_by: accountingValidatorName,
    accounting_validated_at: declaration?.accounting_validated_at ?? null,
    tax_lines: taxLines,
    status_history: statusHistory,
    file_created_at: file.created_at,
    file_updated_at: file.updated_at,
  }

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderToBuffer(<CustomsReportTemplate data={reportData} />)
  } catch (err) {
    console.error('[PDF Report] Erreur génération :', err)
    return NextResponse.json({ error: 'Échec de la génération du rapport PDF.' }, { status: 500 })
  }

  const filename = `rapport-douanier-${reportData.file_ref}.pdf`

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(pdfBuffer.length),
      'Cache-Control': 'no-store',
    },
  })
}
