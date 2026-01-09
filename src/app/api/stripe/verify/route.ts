import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { sendToN8N } from '@/lib/webhooks'


export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const sessionId = request.nextUrl.searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      )
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      )
    }

    const orderId = session.metadata?.orderId
    const paymentType = session.metadata?.paymentType as 'DEPOSIT_60' | 'BALANCE_40'
    const orderReference = session.metadata?.orderReference

    if (!orderId || !paymentType) {
      return NextResponse.json(
        { error: 'Invalid session metadata' },
        { status: 400 }
      )
    }

    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('transaction_ref', session.payment_intent as string)
      .single()

    if (!existingPayment) {
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: orderId,
          type: paymentType,
          amount: (session.amount_total || 0) / 100,
          currency: session.currency?.toUpperCase() || 'USD',
          status: 'BLOCKED',
          payment_method: 'stripe',
          transaction_ref: session.payment_intent as string,
          paid_at: new Date().toISOString(),
        })

      if (paymentError) {
        console.error('Failed to insert payment record:', paymentError)
      }

      const updateField = paymentType === 'DEPOSIT_60' ? 'deposit_paid' : 'balance_paid'
      const { error: orderError } = await supabase
        .from('orders')
        .update({ [updateField]: true })
        .eq('id', orderId)

      if (orderError) {
        console.error('Failed to update order:', orderError)
      }

      // Notify n8n
      await sendToN8N('payment_confirmed', {
        orderId,
        paymentType,
        amount: (session.amount_total || 0) / 100,
        transactionRef: session.payment_intent,
        orderReference
      });

      // Trigger PDF Receipt Generation
      await sendToN8N('payment_receipt_requested', {
        orderId,
        paymentType,
        amount: (session.amount_total || 0) / 100,
        currency: session.currency?.toUpperCase() || 'USD',
        customerEmail: session.customer_details?.email,
        customerName: session.customer_details?.name,
        transactionRef: session.payment_intent,
        orderReference,
        timestamp: new Date().toISOString()
      });
    }


    return NextResponse.json({
      orderReference,
      paymentType,
      amount: session.amount_total,
      status: session.payment_status,
    })
  } catch (error) {
    console.error('Payment verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    )
  }
}
