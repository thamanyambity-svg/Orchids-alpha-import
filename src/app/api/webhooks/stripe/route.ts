
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { executeTransition } from '@/lib/workflow'

// Initialize Stripe

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: Request) {
    // Initialize Stripe inside handler to avoid build-time errors
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
    })
    const body = await request.text()
    const signature = (await headers()).get('stripe-signature') as string

    let event: Stripe.Event

    try {
        if (!signature || !webhookSecret) return new NextResponse('Missing signature or secret', { status: 400 })
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`Webhook signature verification failed: ${message}`)
        return new NextResponse(`Webhook Error: ${message}`, { status: 400 })
    }

    // Initialize Admin Supabase Client (Service Role)
    // We need full access because this is a system event, not a user request
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Handle the event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session

        // We expect the payment link to have metadata: { orderId: '...' }
        const orderId = session.metadata?.orderId

        if (orderId) {
            console.log(`✅ Payment received for Order: ${orderId}`)

            try {
                // Use the centralized Workflow Engine
                // "System" is the actor here. We can use a reserved UUID or fetch the Admin ID.
                // For simplicity/audit, we'll fetch the first ADMIN user or use a 'SYSTEM' placeholder if allowed.
                // Ideally, we should have a system user. For now, we'll try to find an admin.

                const { data: adminUser } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('role', 'ADMIN')
                    .limit(1)
                    .single()

                const systemActorId = adminUser?.id || session.customer as string // Fallback

                // 1. Record the Transaction (Financial Source of Truth)
                const { error: txError } = await supabase
                    .from('transactions')
                    .insert({
                        order_id: orderId,
                        user_id: session.metadata?.userId || systemActorId, // Ideally passed in metadata, fallback to actor
                        amount: session.amount_total ? session.amount_total / 100 : 0, // Convert cents to dollars
                        currency: session.currency?.toUpperCase() || 'USD',
                        type: session.metadata?.paymentType === 'DEPOSIT_60' ? 'DEPOSIT' : 'BALANCE',
                        status: 'SUCCEEDED',
                        stripe_payment_id: session.payment_intent as string,
                        provider: 'STRIPE',
                        metadata: {
                            stripe_session_id: session.id,
                            customer_email: session.customer_details?.email
                        }
                    })

                if (txError) {
                    console.error('❌ Failed to record transaction:', txError)
                    // We continue execution because the payment DID happen on Stripe, 
                    // and we don't want to block the order transition. 
                    // In a perfect world, we'd have a retry mechanism or alert.
                } else {
                    console.log('✅ Transaction recorded in ledger')
                }

                // 2. Transition the Order
                await executeTransition(
                    supabase,
                    'ORDER',
                    orderId,
                    'FUNDED',
                    systemActorId,
                    'ADMIN', // We impersonate Admin role for the system action
                    `Payment confirmed via Stripe (Session: ${session.id})`
                )

                console.log(`✅ Order ${orderId} successfully transitioned to FUNDED`)

            } catch (error) {
                console.error(`❌ Failed to transition order ${orderId}:`, error)
                return new NextResponse('Internal Server Error', { status: 500 })
            }
        } else {
            console.warn('⚠️ Checkout session completed but no orderId in metadata')
        }
    }

    return new NextResponse(null, { status: 200 })
}
