import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole, handleApiError } from '@/lib/auth-guard'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import { sendToN8N } from '@/lib/webhooks'

const submitQuoteSchema = z.object({
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
  port_loading: z.string().optional(),
  port_discharge: z.string().optional(),
  estimated_transit_days: z.number().int().positive().optional(),
  estimated_departure_date: z.string().date().optional(),
  estimated_arrival_date: z.string().date().optional(),
  payment_terms: z.string().default('60% deposit, 40% against documents'),
  validity_days: z.number().int().min(1).max(90).default(30),
  specifications_json: z.record(z.string(), z.unknown()).default({}),
  notes: z.string().optional(),
  proforma_pdf_url: z.string().url().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireRole(['ADMIN', 'PARTNER'])

    const rl = checkRateLimit(`quote:${user.id}`, { maxRequests: 20, windowMs: 60000 })
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = await request.json()
    const parsed = submitQuoteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
    }

    // Verify request exists and partner is assigned
    const { data: importRequest, error: reqError } = await supabase
      .from('import_requests')
      .select('id, status, assigned_partner_id, category')
      .eq('id', parsed.data.request_id)
      .single()

    if (reqError || !importRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Check partner assignment (unless admin)
    const profile = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isAdmin = profile.data?.role === 'ADMIN'

    if (!isAdmin) {
      const { data: partner } = await supabase
        .from('partner_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!partner || importRequest.assigned_partner_id !== partner.id) {
        return NextResponse.json({ error: 'Not assigned to this request' }, { status: 403 })
      }
    }

    // Determine next version
    const { data: existingQuotes } = await supabase
      .from('quotes')
      .select('version')
      .eq('request_id', parsed.data.request_id)
      .order('version', { ascending: false })
      .limit(1)

    const version = (existingQuotes?.[0]?.version || 0) + 1

    // Calculate totals
    const subtotal = parsed.data.unit_price_usd * parsed.data.quantity
    const totalFees = parsed.data.freight_cost_usd + parsed.data.insurance_cost_usd +
      parsed.data.customs_duty_estimate_usd + parsed.data.inspection_cost_usd +
      parsed.data.handling_fees_usd + parsed.data.other_fees_usd
    const grandTotal = subtotal + totalFees

    const { data: quote, error } = await supabase
      .from('quotes')
      .insert({
        request_id: parsed.data.request_id,
        partner_id: partner?.id || importRequest.assigned_partner_id,
        version,
        status: 'SUBMITTED',
        ...parsed.data,
        subtotal_usd: subtotal,
        total_fees_usd: totalFees,
        grand_total_usd: grandTotal,
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    // Update request status to ANALYSIS if was PENDING
    if (importRequest.status === 'PENDING') {
      await supabase
        .from('import_requests')
        .update({ status: 'ANALYSIS', updated_at: new Date().toISOString() })
        .eq('id', parsed.data.request_id)
    }

    await logAudit({
      actorId: user.id,
      action: 'SUBMIT_QUOTE',
      targetType: 'quotes',
      targetId: quote.id,
      details: { request_id: parsed.data.request_id, version, grand_total_usd: grandTotal }
    })

    // Notify n8n
    await sendToN8N('quote_submitted', {
      quoteId: quote.id,
      requestId: parsed.data.request_id,
      partnerId: quote.partner_id,
      grandTotal: grandTotal,
      currency: parsed.data.currency,
      incoterm: parsed.data.incoterm,
    })

    return NextResponse.json(quote)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireRole(['ADMIN', 'PARTNER', 'BUYER'])

    const url = new URL(request.url)
    const requestId = url.searchParams.get('request_id')

    let query = supabase
      .from('quotes')
      .select(`
        *,
        partner:partner_profiles(full_name, company_name, email, phone)
      `)
      .order('version', { ascending: false })

    if (requestId) {
      query = query.eq('request_id', requestId)
    } else {
      // Partner sees own quotes, buyer sees quotes for their requests, admin sees all
      const profile = await supabase.from('profiles').select('role').eq('id', user.id).single()
      const isAdmin = profile.data?.role === 'ADMIN'

      if (!isAdmin) {
        const { data: partner } = await supabase
          .from('partner_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (partner) {
          query = query.eq('partner_id', partner.id)
        } else {
          // Buyer - need to check request ownership
          const { data: requests } = await supabase
            .from('import_requests')
            .select('id')
            .eq('buyer_id', user.id)
          if (requests) {
            query = query.in('request_id', requests.map(r => r.id))
          }
        }
      }
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    return handleApiError(error)
  }
}