import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole, handleApiError } from '@/lib/auth-guard'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAudit } from '@/lib/audit'
import { logAdminAccess, getAdminAuditMetadata } from '@/lib/admin-audit'
import { sendToN8N } from '@/lib/webhooks'

const signPoSchema = z.object({
  cgv_accepted: z.literal(true),
  cgv_version: z.string().default('1.0'),
  cgv_accepted_ip: z.string().optional(),
  cgv_accepted_user_agent: z.string().optional(),
})

const cancelPoSchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, user } = await requireRole(['ADMIN', 'PARTNER', 'BUYER'])

    const rl = checkRateLimit(`po:${user.id}`, { maxRequests: 30, windowMs: 60000 })
    if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    const body = await request.json()
    const url = new URL(request.url)
    const action = url.searchParams.get('action') // 'sign' or 'cancel'

    // Get PO with related data
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        request:import_requests(buyer_id, status),
        quote:quotes(grand_total_usd, currency, incoterm)
      `)
      .eq('id', params.id)
      .single()

    if (poError || !po) {
      return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 })
    }

    const profile = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isAdmin = profile.data?.role === 'ADMIN'
    const isBuyer = po.request.buyer_id === user.id
    const isAssignedPartner = await supabase
      .from('partner_profiles')
      .select('id')
      .eq('id', po.partner_id)
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => !!data)

    if (!isAdmin && !isBuyer && !isAssignedPartner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (action === 'sign') {
      // Only buyer can sign
      if (!isBuyer && !isAdmin) {
        return NextResponse.json({ error: 'Only buyer can sign PO' }, { status: 403 })
      }

      if (po.status !== 'GENERATED' && po.status !== 'PENDING_SIGNATURE') {
        return NextResponse.json({ error: 'PO cannot be signed in current state' }, { status: 400 })
      }

      const parsed = signPoSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
      }

      if (!parsed.data.cgv_accepted) {
        return NextResponse.json({ error: 'CGV must be accepted' }, { status: 400 })
      }

      // Get client metadata
      const meta = getAdminAuditMetadata(request)

      const { data: updatedPo, error } = await supabase
        .from('purchase_orders')
        .update({
          status: 'SIGNED',
          cgv_accepted_at: new Date().toISOString(),
          cgv_version: parsed.data.cgv_version,
          cgv_accepted_ip: meta.ip,
          cgv_accepted_user_agent: meta.userAgent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id)
        .select()
        .single()

      if (error) throw error

      await logAudit({
        actorId: user.id,
        action: 'SIGN_PO',
        targetType: 'purchase_orders',
        targetId: params.id,
        details: { cgv_version: parsed.data.cgv_version, cgv_accepted_ip: meta.ip }
      })

      return NextResponse.json({ success: true, data: updatedPo })
    }

    if (action === 'cancel') {
      // Buyer can cancel within 48h of CGV acceptance
      if (!isBuyer && !isAdmin) {
        return NextResponse.json({ error: 'Only buyer can cancel' }, { status: 403 })
      }

      if (!po.cgv_accepted_at) {
        return NextResponse.json({ error: 'CGV not yet accepted' }, { status: 400 })
      }

      const acceptedAt = new Date(po.cgv_accepted_at)
      const expiresAt = new Date(acceptedAt.getTime() + 48 * 60 * 60 * 1000)
      const now = new Date()

      if (now > expiresAt && !isAdmin) {
        return NextResponse.json({ error: 'Cancellation window expired (48h)' }, { status: 400 })
      }

      if (!['GENERATED', 'PENDING_SIGNATURE', 'SIGNED'].includes(po.status)) {
        return NextResponse.json({ error: 'PO cannot be cancelled in current state' }, { status: 400 })
      }

      const parsed = cancelPoSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
      }

      const meta = getAdminAuditMetadata(request)

      const { error } = await supabase
        .from('purchase_orders')
        .update({
          status: 'CANCELLED',
          cancellation_requested_at: now.toISOString(),
          cancellation_reason: parsed.data.reason,
          cancellation_confirmed_at: now.toISOString(),
          cancellation_confirmed_by: isAdmin ? user.id : po.request.buyer_id,
          cancelled_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', params.id)

      if (error) throw error

      // Cancel linked order
      await supabase
        .from('orders')
        .update({ status: 'CANCELLED', updated_at: now.toISOString() })
        .eq('reference', po.po_number)

      // Log cancellation
      await supabase.from('po_cancellation_requests').insert({
        po_id: params.id,
        requested_by: user.id,
        reason: parsed.data.reason,
        status: 'APPROVED',
        processed_at: now.toISOString(),
        processed_by: isAdmin ? user.id : po.request.buyer_id,
      })

      await logAudit({
        actorId: user.id,
        action: 'CANCEL_PO',
        targetType: 'purchase_orders',
        targetId: params.id,
        details: { reason: parsed.data.reason, within_48h: now < expiresAt }
      })

      if (isAdmin) {
        logAdminAccess({
          adminId: user.id,
          action: 'ADMIN_CANCEL_PO',
          resource: 'purchase_orders',
          resourceId: params.id,
          details: { reason: parsed.data.reason, ...meta },
          ip: meta.ip,
          userAgent: meta.userAgent,
        }).catch(console.error)
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, user } = await requireRole(['ADMIN', 'PARTNER', 'BUYER'])

    const { data: po, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        request:import_requests(buyer_id, reference, category),
        quote:quotes(*),
        buyer:profiles!purchase_orders_buyer_id_fkey(email, full_name, company_name),
        partner:partner_profiles(full_name, company_name, email)
      `)
      .eq('id', params.id)
      .single()

    if (error) throw error

    // Check permission
    const profile = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isAdmin = profile.data?.role === 'ADMIN'
    const isBuyer = po.request.buyer_id === user.id
    const isAssignedPartner = await supabase
      .from('partner_profiles')
      .select('id')
      .eq('id', po.partner_id)
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => !!data)

    if (!isAdmin && !isBuyer && !isAssignedPartner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get cancellation requests
    const { data: cancellations } = await supabase
      .from('po_cancellation_requests')
      .select('*')
      .eq('po_id', params.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ ...po, cancellations: cancellations || [] })
  } catch (error) {
    return handleApiError(error)
  }
}