import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendToN8N } from '@/lib/webhooks'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
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
