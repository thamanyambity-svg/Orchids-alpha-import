import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, handleApiError } from '@/lib/auth-guard'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'

const signPOSchema = z.object({
  po_id: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser()

    const rl = checkRateLimit(`po-sign:${user.id}`, { maxRequests: 5, windowMs: 60000 })
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = await request.json()
    const parsed = signPOSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Get PO
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('id', parsed.data.po_id)
      .single()

    if (poError || !po) {
      return NextResponse.json({ error: 'PO not found' }, { status: 404 })
    }

    // Only buyer can sign
    if (po.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Only buyer can sign PO' }, { status: 403 })
    }

    // Check status
    if (!['GENERATED', 'PENDING_SIGNATURE'].includes(po.status)) {
      return NextResponse.json({ error: 'PO not in signable state' }, { status: 400 })
    }

    // Check 48h window not expired
    if (po.cgv_accepted_at && new Date(po.cgv_accepted_at).getTime() + 48 * 60 * 60 * 1000 < Date.now()) {
      return NextResponse.json({ error: '48h window expired, PO auto-confirmed' }, { status: 400 })
    }

    // Get client IP and user agent
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const ua = request.headers.get('user-agent') || 'unknown'

    const { data: signedPO, error } = await supabase
      .from('purchase_orders')
      .update({
        status: 'SIGNED',
        cgv_accepted_at: new Date().toISOString(),
        cgv_accepted_ip: ip,
        cgv_accepted_user_agent: ua,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parsed.data.po_id)
      .select()
      .single()

    if (error) throw error

    await logAudit({
      actorId: user.id,
      action: 'SIGN_PO',
      targetType: 'purchase_orders',
      targetId: po.id,
      details: { po_number: po.po_number, cgv_accepted_at: new Date().toISOString() }
    })

    return NextResponse.json({ success: true, po: signedPO })
  } catch (error) {
    return handleApiError(error)
  }
}