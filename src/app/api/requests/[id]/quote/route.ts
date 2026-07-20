import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, handleApiError } from '@/lib/auth-guard'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendToN8N } from '@/lib/webhooks'
import { logAudit } from '@/lib/audit'

const createQuoteSchema = z.object({
  request_id: z.string().uuid(),
  unit_price_usd: z.number().positive(),
  quantity: z.number().int().positive(),
  currency: z.string().length(3).default('USD'),
  freight_cost_usd: z.number().min(0).default(0),
  insurance_cost_usd: z.number().min(0).default(0),
  customs_duty_estimate_usd: z.number().min(0).default(0),
  inspection_cost_usd: z.number().min(0).default(0),
  handling_fees_usd: z.number().min(0).default(0),
  other_fees_usd: z.number().min(0).default(0),
  incoterm: z.enum(['EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP']).default('FOB'),
  port_loading: z.string().nullable().optional(),
  port_discharge: z.string().nullable().optional(),
  estimated_transit_days: z.number().int().positive().nullable().optional(),
  estimated_departure_date: z.string().nullable().optional(),
  estimated_arrival_date: z.string().nullable().optional(),
  payment_terms: z.string().default('60% deposit, 40% against documents'),
  validity_days: z.number().int().min(1).max(90).default(30),
  specifications_json: z.record(z.unknown()).nullable().optional(),
  notes: z.string().nullable().optional(),
  proforma_pdf_url: z.string().url().nullable().optional(),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, user } = await requireUser()

    const rl = checkRateLimit(`quote:${user.id}`, { maxRequests: 20, windowMs: 60000 })
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = await request.json()
    const parsed = createQuoteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
    }

    // Verify request exists and user has permission (partner assigned or admin)
    const { data: request, error: reqError } = await supabase
      .from('import_requests')
      .select('id, status, assigned_partner_id, buyer_id, category')
      .eq('id', id)
      .single()

    if (reqError || !request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Check permission: partner assigned to this request, or admin, or buyer (view only)
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isAdmin = profile?.role === 'ADMIN'
    const isAssignedPartner = request.assigned_partner_id && 
      (await supabase.from('partner_profiles').select('id').eq('id', request.assigned_partner_id).eq('user_id', user.id).single()).data
    const isBuyer = request.buyer_id === user.id

    if (!isAdmin && !isAssignedPartner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get latest version
    const { data: latestQuote } = await supabase
      .from('quotes')
      .select('version')
      .eq('request_id', id)
      .order('version', { ascending: false })
      .limit(1)
      .single()

    const version = (latestQuote?.version || 0) + 1

    // Calculate totals
    const subtotal = parsed.data.unit_price_usd * parsed.data.quantity
    const totalFees = parsed.data.freight_cost_usd + parsed.data.insurance_cost_usd + 
      parsed.data.customs_duty_estimate_usd + parsed.data.inspection_cost_usd + 
      parsed.data.handling_fees_usd + parsed.data.other_fees_usd
    const grandTotal = subtotal + totalFees

    const { data: quote, error } = await supabase
      .from('quotes')
      .insert({
        request_id: id,
        partner_id: request.assigned_partner_id,
        version,
        status: 'SUBMITTED',
        unit_price_usd: parsed.data.unit_price_usd,
        quantity: parsed.data.quantity,
        currency: parsed.data.currency,
        subtotal_usd: subtotal,
        freight_cost_usd: parsed.data.freight_cost_usd,
        insurance_cost_usd: parsed.data.insurance_cost_usd,
        customs_duty_estimate_usd: parsed.data.customs_duty_estimate_usd,
        inspection_cost_usd: parsed.data.inspection_cost_usd,
        handling_fees_usd: parsed.data.handling_fees_usd,
        other_fees_usd: parsed.data.other_fees_usd,
        total_fees_usd: totalFees,
        grand_total_usd: grandTotal,
        incoterm: parsed.data.incoterm,
        port_loading: parsed.data.port_loading,
        port_discharge: parsed.data.port_discharge,
        estimated_transit_days: parsed.data.estimated_transit_days,
        estimated_departure_date: parsed.data.estimated_departure_date,
        estimated_arrival_date: parsed.data.estimated_arrival_date,
        payment_terms: parsed.data.payment_terms,
        validity_days: parsed.data.validity_days,
        specifications_json: parsed.data.specifications_json,
        notes: parsed.data.notes,
        proforma_pdf_url: parsed.data.proforma_pdf_url,
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    // Update request status
    await supabase
      .from('import_requests')
      .update({ status: 'ANALYSIS', updated_at: new Date().toISOString() })
      .eq('id', id)

    // Audit log
    await logAudit({
      actorId: user.id,
      action: 'CREATE_QUOTE',
      targetType: 'quotes',
      targetId: quote.id,
      details: { requestId: id, version, grandTotal, incoterm: parsed.data.incoterm }
    })

    // Notify n8n
    await sendToN8N('quote_submitted', {
      quoteId: quote.id,
      requestId: id,
      version,
      grandTotal,
      incoterm: parsed.data.incoterm,
      buyerId: request.buyer_id,
    }).catch(console.error)

    // Notify buyer
    const { data: buyer } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', request.buyer_id)
      .single()

    if (buyer) {
      // Notification handled by trigger or separate function
    }

    return NextResponse.json(quote)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, user } = await requireUser()

    const { data: quotes, error } = await supabase
      .from('quotes')
      .select(`
        *,
        partner:partner_profiles(full_name, company_name, email, phone)
      `)
      .eq('request_id', id)
      .order('version', { ascending: false })

    if (error) throw error

    return NextResponse.json(quotes)
  } catch (error) {
    return handleApiError(error)
  }
}