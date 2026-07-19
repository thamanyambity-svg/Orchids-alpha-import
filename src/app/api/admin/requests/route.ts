import { NextRequest, NextResponse } from 'next/server'
import { sendToN8N } from '@/lib/webhooks'
import { logAudit } from '@/lib/audit'
import { requireRole, handleApiError } from '@/lib/auth-guard'
import { processAutomaticDebit } from '@/lib/payments/auto-debit.service'
import { logAdminAccess, getAdminAuditMetadata } from '@/lib/admin-audit'
import { checkRateLimit } from '@/lib/rate-limit'


export async function POST(request: NextRequest) {
  try {
    // Réservé aux ADMIN. Le client SSR (RLS) sert pour les écritures de données ;
    // les politiques admin (FOR ALL) autorisent ces opérations.
    const { supabase, user } = await requireRole(['ADMIN'])

    // Rate limit
    const rateCheck = checkRateLimit(`admin:${user.id}`, { maxRequests: 120, windowMs: 60000 })
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 })
    }

    const body = await request.json()
    const { action, requestId, data: actionData } = body

    // Log admin access
    const meta = getAdminAuditMetadata(request)
    logAdminAccess({
      adminId: user.id,
      action: `ADMIN_${action}`,
      resource: 'import_requests',
      resourceId: requestId,
      details: { action, ...meta },
      ip: meta.ip,
      userAgent: meta.userAgent,
    }).catch(console.error)

    if (!requestId || !action) {
      return NextResponse.json({ error: 'Missing requestId or action' }, { status: 400 })
    }

    let result: any = null
    let n8nEvent = ''

    switch (action) {
      case 'ASSIGN_PARTNER': {
        const { partnerId } = actionData
        const { data, error } = await supabase
          .from('import_requests')
          .update({
            assigned_partner_id: partnerId,
            status: 'ANALYSIS',
            updated_at: new Date().toISOString()
          })
          .eq('id', requestId)
          .select()
          .single()

        if (error) throw error
        result = data
        n8nEvent = 'partner_assigned'

        await logAudit({
          actorId: user.id,
          action: 'ASSIGN_PARTNER',
          targetType: 'import_requests',
          targetId: requestId,
          details: { partnerId }
        })
        break
      }

      case 'VALIDATE': {
        // 1. Update request status
        const { data: requestData, error: reqError } = await supabase
          .from('import_requests')
          .update({
            status: 'VALIDATED',
            updated_at: new Date().toISOString()
          })
          .eq('id', requestId)
          .select()
          .single()

        if (reqError) throw reqError

        // 2. Create Order
        const orderRef = `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
        const totalAmount = requestData.budget_max || 0
        const commission = totalAmount * 0.1

        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert({
            reference: orderRef,
            request_id: requestId,
            total_amount: totalAmount,
            alpha_commission: commission,
            partner_payout: totalAmount - commission,
            status: 'AWAITING_DEPOSIT',
            validated_by_admin: true,
            deposit_amount: totalAmount * 0.6,
            balance_amount: totalAmount * 0.4,
          })
          .select()
          .single()

        if (orderError) throw orderError
        result = { request: requestData, order: orderData }
        n8nEvent = 'request_validated'

        await logAudit({
          actorId: user.id,
          action: 'VALIDATE_REQUEST',
          targetType: 'import_requests',
          targetId: requestId,
          details: { orderId: orderData.id, reference: orderRef }
        })

        // Trigger certified report generation (Alpha Compliance Report)
        await sendToN8N('certified_report_requested', {
          requestId,
          orderId: orderData.id,
          orderReference: orderRef,
          amount: totalAmount,
          clientName: requestData.user_id,
          timestamp: new Date().toISOString()
        })

        // SEPA auto-debit: charge deposit 60% if buyer has mandate
        try {
          const { data: buyerProfile } = await supabase
            .from('profiles')
            .select('mandate_activated')
            .eq('id', requestData.user_id || requestData.buyer_id)
            .single()

          if (buyerProfile?.mandate_activated && orderData.deposit_amount > 0) {
            await processAutomaticDebit(orderData.id, 0.6)
              .catch(e => console.error('SEPA auto-debit deposit failed:', e))
          }
        } catch (e) {
          console.error('SEPA auto-debit check failed:', e)
        }

        break
      }

      case 'REJECT': {
        const { data, error } = await supabase
          .from('import_requests')
          .update({
            status: 'REJECTED',
            updated_at: new Date().toISOString()
          })
          .eq('id', requestId)
          .select()
          .single()

        if (error) throw error
        result = data
        n8nEvent = 'request_rejected'

        await logAudit({
          actorId: user.id,
          action: 'REJECT_REQUEST',
          targetType: 'import_requests',
          targetId: requestId,
          details: { reason: actionData?.reason || 'No reason provided' }
        })
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Trigger n8n webhook
    if (n8nEvent) {
      await sendToN8N(n8nEvent, {
        requestId,
        action,
        timestamp: new Date().toISOString(),
        details: result
      })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
