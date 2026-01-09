import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'


export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { orderId, paymentType } = await request.json()

    if (!orderId || !paymentType) {
      return NextResponse.json(
        { error: 'orderId and paymentType are required' },
        { status: 400 }
      )
    }

    if (paymentType !== 'DEPOSIT_60' && paymentType !== 'BALANCE_40') {
      return NextResponse.json(
        { error: 'paymentType must be DEPOSIT_60 or BALANCE_40' },
        { status: 400 }
      )
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, reference, total_amount, deposit_amount, balance_amount, deposit_paid, balance_paid')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    if (paymentType === 'DEPOSIT_60' && order.deposit_paid) {
      return NextResponse.json(
        { error: 'Deposit already paid' },
        { status: 400 }
      )
    }

    if (paymentType === 'BALANCE_40' && order.balance_paid) {
      return NextResponse.json(
        { error: 'Balance already paid' },
        { status: 400 }
      )
    }

    if (paymentType === 'BALANCE_40' && !order.deposit_paid) {
      return NextResponse.json(
        { error: 'Deposit must be paid before balance' },
        { status: 400 }
      )
    }

    const amount = paymentType === 'DEPOSIT_60'
      ? Number(order.deposit_amount)
      : Number(order.balance_amount)

    const amountInCents = Math.round(amount * 100)

    const origin = request.headers.get('origin') || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: paymentType === 'DEPOSIT_60'
                ? `Deposit (60%) - Order ${order.reference}`
                : `Balance (40%) - Order ${order.reference}`,
              description: `Payment for order ${order.reference}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        orderId: order.id,
        paymentType: paymentType,
        orderReference: order.reference,
      },
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment/cancel?order_id=${order.id}`,
    })

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
