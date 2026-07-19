import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, handleApiError } from '@/lib/auth-guard'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'

const cancelPOSchema = z.object({
  po_id: z.string().uuid(),
  reason: z.string().min(10).max(500),
})

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser()

    const rl = checkRateLimit(`po-cancel:${user.id}`, { maxRequests: 5, windowMs: 3600000 })
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = await request.json()
    const parsed = cancelPOSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('id', parsed.data.po_id)
      .single()

    if (poError || !po) {
      return NextResponse.json({ error: 'PO not found' }, { status: 404 })
    }

    // Only buyer can cancel
    if (po.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Only buyer can cancel PO' }, { status: 403 })
    }

    // Check 48h window
    if (!po.cgv_accepted_at) {
      return NextResponse.json({ error: 'PO not yet signed' }, { status: 400 })
    }

    const acceptedAt = new Date(po.cgv_accepted_at)
    const expiresAt = new Date(acceptedAt.getTime() + 48 * 60 * 60 * 1000)
    
    if (expiresAt < new Date()) {
      return NextResponse.json({ error: '48h cancellation window expired' }, { status: 400 })
    }

    if (!['GENERATED', 'PENDING_SIGNATURE', 'SIGNED'].includes(po.status)) {
      return NextResponse.json({ error: 'PO cannot be cancelled in current state' }, { status: 400 })
    }

    // Cancel PO
    const { data: cancelledPO, error } = await supabase
      .from('purchase_orders')
      .update({
        status: 'CANCELLED',
        cancellation_requested_at: new Date().toISOString(),
        cancellation_reason: parsed.data.reason,
        cancellation_confirmed_at: new Date().toISOString(),
        cancellation_confirmed_by: user.id,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', parsed.data.po_id)
      .select()
      .single()

    if (error) throw error

    // Cancel linked order if exists
    if (po.order_id) {
      await supabase
        .from('orders')
        .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
        .eq('id', po.order_id)
    }

    // Log cancellation request
    await supabase
      .from('po_cancellation_requests')
      .insert({
        po_id: po.id,
        requested_by: user.id,
        reason: parsed.data.reason,
        status: 'APPROVED',
        processed_at: new Date().toISOString(),
        processed_by: user.id,
      })

    await logAudit({
      actorId: user.id,
      action: 'CANCEL_PO',
      targetType: 'purchase_orders',
      targetId: po.id,
      details: { po_number: po.po_number, reason: parsed.data.reason, within_48h: true }
    })

    return NextResponse.json({ success: true, po: cancelledPO })
  } catch (error) {
    return handleApiError(error)
  }
}