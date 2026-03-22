/**
 * GET /api/customs/invoice/[id] — PDF facture (customs_invoices.id)
 */

import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { CustomsInvoiceTemplate } from '@/components/pdf/customs-invoice-template'
import type { InvoicePdfData, InvoicePdfLineItem } from '@/lib/pdf/invoice-pdf-types'

type InvoiceRow = {
  id: string
  invoice_number: string
  status: string
  issued_at: string
  due_date: string
  billed_to_user_id: string
  subtotal_disbursements_usd: number
  subtotal_fees_usd: number
  total_usd: number
  total_local: number | null
  currency_local: string | null
  customs_file_id: string
  exchange_rate_id: string | null
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: invoiceId } = await context.params

  if (!invoiceId) {
    return NextResponse.json({ error: 'Identifiant de facture manquant.' }, { status: 400 })
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profil introuvable.' }, { status: 403 })
  }

  const isAdmin = profile.role === 'ADMIN'
  const isBuyer = profile.role === 'BUYER'

  if (!isAdmin && !isBuyer) {
    return NextResponse.json(
      { error: 'Accès réservé à l’administration et aux clients.' },
      { status: 403 }
    )
  }

  const { data: invoice, error: invError } = await supabase
    .from('customs_invoices')
    .select(
      'id, invoice_number, status, issued_at, due_date, billed_to_user_id, ' +
        'subtotal_disbursements_usd, subtotal_fees_usd, total_usd, total_local, ' +
        'currency_local, customs_file_id, exchange_rate_id'
    )
    .eq('id', invoiceId)
    .single<InvoiceRow>()

  if (invError || !invoice) {
    return NextResponse.json({ error: 'Facture introuvable.' }, { status: 404 })
  }

  if (isBuyer) {
    if (invoice.billed_to_user_id !== user.id) {
      return NextResponse.json({ error: 'Cette facture ne vous appartient pas.' }, { status: 403 })
    }
    if (!['SENT', 'PAID'].includes(invoice.status)) {
      return NextResponse.json({ error: "Cette facture n'est pas encore disponible." }, { status: 403 })
    }
  }

  const [{ data: itemsRows }, { data: buyerProfile }, { data: fileRow }, { data: declRow }] =
    await Promise.all([
      supabase
        .from('invoice_items')
        .select('label, quantity, unit_price_usd, line_total_usd, item_type, sort_order')
        .eq('invoice_id', invoiceId)
        .order('sort_order', { ascending: true }),
      supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', invoice.billed_to_user_id)
        .maybeSingle(),
      supabase
        .from('customs_files')
        .select('transport_mode, transport_ref, country_code')
        .eq('id', invoice.customs_file_id)
        .maybeSingle(),
      supabase
        .from('customs_declarations')
        .select('declaration_number')
        .eq('customs_file_id', invoice.customs_file_id)
        .maybeSingle(),
    ])

  let exchangeRate: number | null = null
  if (invoice.exchange_rate_id) {
    const { data: rateRow } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('id', invoice.exchange_rate_id)
      .maybeSingle()
    if (rateRow?.rate != null) {
      exchangeRate = Number(rateRow.rate)
    }
  }
  if (
    exchangeRate == null &&
    invoice.total_local != null &&
    Number(invoice.total_usd) > 0
  ) {
    exchangeRate = Number(invoice.total_local) / Number(invoice.total_usd)
  }

  const items: InvoicePdfLineItem[] = (itemsRows ?? []).map((item) => ({
    label: item.label,
    quantity: Number(item.quantity),
    unit_price_usd: Number(item.unit_price_usd),
    line_total_usd: Number(item.line_total_usd),
    item_type: String(item.item_type),
  }))

  items.sort((a, b) => {
    const order = (t: string) =>
      t === 'DISBURSEMENT' ? 0 : t === 'FILE_FEE' ? 1 : 2
    return order(a.item_type) - order(b.item_type)
  })

  const pdfData: InvoicePdfData = {
    invoice_number: invoice.invoice_number,
    issued_at: invoice.issued_at,
    due_date: invoice.due_date,
    status: invoice.status,
    buyer_name: buyerProfile?.full_name ?? null,
    buyer_email: buyerProfile?.email ?? null,
    transport_mode: fileRow?.transport_mode ?? null,
    transport_ref: fileRow?.transport_ref ?? null,
    declaration_number: declRow?.declaration_number ?? null,
    country_code: fileRow?.country_code ?? 'CD',
    items,
    subtotal_disbursements_usd: Number(invoice.subtotal_disbursements_usd),
    subtotal_fees_usd: Number(invoice.subtotal_fees_usd),
    total_usd: Number(invoice.total_usd),
    total_local: invoice.total_local != null ? Number(invoice.total_local) : null,
    currency_local: invoice.currency_local ?? 'CDF',
    exchange_rate: exchangeRate,
    customs_file_id: invoice.customs_file_id,
    generated_at: new Date().toISOString(),
  }

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderToBuffer(<CustomsInvoiceTemplate data={pdfData} />)
  } catch (renderError) {
    console.error('[PDF] Erreur de génération :', renderError)
    return NextResponse.json(
      { error: 'Échec de la génération du PDF. Réessayez.' },
      { status: 500 }
    )
  }

  const filename = `${invoice.invoice_number.replace(/[^A-Z0-9-]/gi, '_')}.pdf`

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
