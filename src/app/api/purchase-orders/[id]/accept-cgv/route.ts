import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, handleApiError } from '@/lib/auth-guard'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'

// Accept CGV for a PO
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, user } = await requireUser()

    const rl = checkRateLimit(`cgv:${user.id}`, { maxRequests: 10, windowMs: 60000 })
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = await request.json()
    const schema = z.object({
      cgv_accepted: z.literal(true),
      cgv_version: z.string().default('1.0'),
    })

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'CGV must be accepted' }, { status: 400 })
    }

    // Get PO and verify buyer
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .select('id, status, cgv_accepted_at, request:import_requests(buyer_id)')
      .eq('id', params.id)
      .single()

    if (poError || !po) {
      return NextResponse.json({ error: 'PO not found' }, { status: 404 })
    }

    if (po.request.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Only buyer can accept CGV' }, { status: 403 })
    }

    if (po.cgv_accepted_at) {
      return NextResponse.json({ error: 'CGV already accepted' }, { status: 400 })
    }

    if (!['GENERATED', 'PENDING_SIGNATURE'].includes(po.status)) {
      return NextResponse.json({ error: 'PO not in signable state' }, { status: 400 })
    }

    const meta = { ip: request.headers.get('x-forwarded-for') || 'unknown', ua: request.headers.get('user-agent') || 'unknown' }

    const { data: updatedPo, error } = await supabase
      .from('purchase_orders')
      .update({
        status: 'PENDING_SIGNATURE',
        cgv_accepted_at: new Date().toISOString(),
        cgv_version: parsed.data.cgv_version,
        cgv_accepted_ip: meta.ip,
        cgv_accepted_user_agent: meta.ua,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    await logAudit({
      actorId: user.id,
      action: 'ACCEPT_CGV',
      targetType: 'purchase_orders',
      targetId: params.id,
      details: { cgv_version: parsed.data.cgv_version, ip: meta.ip }
    })

    return NextResponse.json({ success: true, data: updatedPo })
  } catch (error) {
    return handleApiError(error)
  }
}