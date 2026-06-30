import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendToN8N } from '@/lib/webhooks'
import { logAudit } from '@/lib/audit'
import { requireAdmin } from '@/lib/reporting/auth'
import { createOrderForRequest } from '@/lib/workflow'


export async function POST(request: NextRequest) {
  // Réservé ADMIN. Le service-role n'est utilisé qu'après ce contrôle.
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const body = await request.json()
    const { action, requestId, data: actionData } = body

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
          actorId: auth.id,
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

        // 1b. Cotation soumise par le partenaire : son total prime, et on la valide.
        const { data: quote } = await supabase
          .from('request_quotes')
          .select('id, total_amount')
          .eq('request_id', requestId)
          .in('status', ['SUBMITTED', 'DRAFT'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (quote?.id) {
          await supabase.from('request_quotes').update({ status: 'APPROVED' }).eq('id', quote.id)
        }

        // 2. Create Order — chemin UNIQUE (total = cotation si dispo, sinon budget)
        const orderData = await createOrderForRequest(supabase, requestData, quote?.total_amount)
        result = { request: requestData, order: orderData }
        n8nEvent = 'request_validated'

        await logAudit({
          actorId: auth.id,
          action: 'VALIDATE_REQUEST',
          targetType: 'import_requests',
          targetId: requestId,
          details: { orderId: orderData.id, reference: orderData.reference }
        })

        // Trigger certified report generation (Alpha Compliance Report)
        await sendToN8N('certified_report_requested', {
          requestId,
          orderId: orderData.id,
          orderReference: orderData.reference,
          amount: orderData.total_amount,
          clientName: requestData.buyer_id,
          timestamp: new Date().toISOString()
        })
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
          actorId: auth.id,
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
  } catch (error: any) {
    console.error(`Admin request action error:`, error)
    return NextResponse.json(
      { error: error.message || 'Action failed' },
      { status: 500 }
    )
  }
}
