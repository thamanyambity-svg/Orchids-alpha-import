import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, handleApiError } from '@/lib/auth-guard'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'

const acceptQuoteSchema = z.object({
  quote_id: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser()

    const rl = checkRateLimit(`quote-accept:${user.id}`, { maxRequests: 10, windowMs: 60000 })
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = await request.json()
    const parsed = acceptQuoteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
    }

    // Get quote with request
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        request:import_requests(buyer_id, status, category, reference)
      `)
      .eq('id', parsed.data.quote_id)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Only buyer can accept
    if (quote.request.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Only buyer can accept quote' }, { status: 403 })
    }

    if (quote.status !== 'SUBMITTED') {
      return NextResponse.json({ error: 'Quote not in submittable state' }, { status: 400 })
    }

    // Check quote validity
    if (quote.valid_until && new Date(quote.valid_until) < new Date()) {
      return NextResponse.json({ error: 'Quote expired' }, { status: 400 })
    }

    // Accept quote
    const { data: updatedQuote, error: updateError } = await supabase
      .from('quotes')
      .update({
        status: 'ACCEPTED',
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', parsed.data.quote_id)
      .select()
      .single()

    if (updateError) throw updateError

    // Create PO via trigger (already handles in DB)
    const { data: poData, error: poError } = await supabase
      .from('purchase_orders')
      .select('id, po_number')
      .eq('quote_id', quote.id)
      .single()

    if (poError) throw poError

    // Update request status
    await supabase
      .from('import_requests')
      .update({ status: 'QUOTE_ACCEPTED', updated_at: new Date().toISOString() })
      .eq('id', quote.request_id)

    await logAudit({
      actorId: user.id,
      action: 'ACCEPT_QUOTE',
      targetType: 'quotes',
      targetId: quote.id,
      details: { po_id: poData?.id, po_number: poData?.po_number, grand_total: quote.grand_total_usd }
    })

    return NextResponse.json({ 
      success: true, 
      quote: updatedQuote,
      purchase_order: poData
    })
  } catch (error) {
    return handleApiError(error)
  }
}