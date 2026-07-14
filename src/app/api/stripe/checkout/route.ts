import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { requireUser, handleApiError } from '@/lib/auth-guard'
import { checkoutPayloadSchema } from '@/lib/validation'


export async function POST(request: NextRequest) {
  try {
    // Auth requise. Client SSR (RLS) : un acheteur ne "voit" que ses propres
    // commandes (via orders_via_request_buyer) -> anti-IDOR sur orderId.
    const { supabase } = await requireUser()

    let payload: { orderId: string; paymentType: 'DEPOSIT_60' | 'BALANCE_40' }
    try {
      payload = checkoutPayloadSchema.parse(await request.json())
    } catch {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const { orderId, paymentType } = payload

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

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 })
    }

    const amountInCents = Math.round(amount * 100)

    const origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      // @ts-expect-error automatic_payment_methods n'est pas typé pour Checkout Sessions
      automatic_payment_methods: { enabled: true },
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
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
