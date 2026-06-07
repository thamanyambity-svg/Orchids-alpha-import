
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { executeTransition } from '@/lib/workflow'
import { sendToN8N } from '@/lib/webhooks'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: Request) {
    // Initialize Stripe inside handler to avoid build-time errors
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2024-12-18.acacia' as any,
    })
    const body = await request.text()
    const signature = (await headers()).get('stripe-signature') as string

    let event: Stripe.Event

    try {
        if (!signature || !webhookSecret) return new NextResponse('Missing signature or secret', { status: 400 })
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (error: any) {
        console.error(`Webhook signature verification failed: ${error.message}`)
        return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 })
    }

    // Client service-role isolé (événement système, pas de session utilisateur).
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // --- Idempotence : on "réclame" l'événement avant traitement ---
    const { error: claimError } = await supabase
        .from('processed_stripe_events')
        .insert({ event_id: event.id, type: event.type })

    if (claimError) {
        if ((claimError as { code?: string }).code === '23505') {
            console.log(`↩️ Stripe event ${event.id} déjà traité — ignoré (idempotence)`)
            return new NextResponse(null, { status: 200 })
        }
        console.error('Idempotency store error:', claimError)
        return new NextResponse('Idempotency store error', { status: 500 })
    }

    // ------------------------------------------------------------------------
    // Le webhook est la SEULE source de vérité financière (/api/stripe/verify est
    // en lecture seule). Il écrit transactions + payments + flags, applique la
    // transition d'état, puis notifie n8n.
    // ------------------------------------------------------------------------
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session

        const orderId = session.metadata?.orderId
        const paymentType = session.metadata?.paymentType as 'DEPOSIT_60' | 'BALANCE_40' | undefined
        const orderReference = session.metadata?.orderReference
        const amount = session.amount_total ? session.amount_total / 100 : 0
        const currency = session.currency?.toUpperCase() || 'USD'
        const transactionRef = session.payment_intent as string

        if (!orderId) {
            console.warn('⚠️ Checkout session completed but no orderId in metadata')
            return new NextResponse(null, { status: 200 })
        }

        console.log(`✅ Payment received for Order: ${orderId} (${paymentType})`)

        // Acheteur réel (transactions.user_id NOT NULL FK profiles) : commande -> demande -> buyer_id.
        // Jamais session.customer (id Stripe, pas un profiles.id).
        let buyerId = session.metadata?.userId
        if (!buyerId) {
            const { data: orderRow } = await supabase
                .from('orders')
                .select('request_id')
                .eq('id', orderId)
                .maybeSingle()
            if (orderRow?.request_id) {
                const { data: reqRow } = await supabase
                    .from('import_requests')
                    .select('buyer_id')
                    .eq('id', orderRow.request_id)
                    .maybeSingle()
                buyerId = reqRow?.buyer_id
            }
        }
        if (!buyerId) console.warn(`⚠️ Acheteur introuvable pour la commande ${orderId}`)

        // 1. transactions (registre financier — lu par le dashboard admin)
        const { error: txError } = await supabase
            .from('transactions')
            .insert({
                order_id: orderId,
                user_id: buyerId,
                amount,
                currency,
                type: paymentType === 'DEPOSIT_60' ? 'DEPOSIT' : 'BALANCE',
                status: 'SUCCEEDED',
                stripe_payment_id: transactionRef,
                provider: 'STRIPE',
                metadata: {
                    stripe_session_id: session.id,
                    customer_email: session.customer_details?.email,
                },
            })
        if (txError) console.error('❌ Failed to record transaction:', txError)

        // 2. payments (consolidée depuis /verify — idempotent sur transaction_ref)
        const { data: existingPayment } = await supabase
            .from('payments')
            .select('id')
            .eq('transaction_ref', transactionRef)
            .maybeSingle()

        if (!existingPayment) {
            const { error: payError } = await supabase
                .from('payments')
                .insert({
                    order_id: orderId,
                    type: paymentType,
                    amount,
                    currency,
                    status: 'BLOCKED',
                    payment_method: 'stripe',
                    transaction_ref: transactionRef,
                    paid_at: new Date().toISOString(),
                })
            if (payError) console.error('❌ Failed to insert payment record:', payError)
        }

        // 3. flags deposit_paid / balance_paid
        const updateField = paymentType === 'DEPOSIT_60' ? 'deposit_paid' : 'balance_paid'
        const { error: flagError } = await supabase
            .from('orders')
            .update({ [updateField]: true })
            .eq('id', orderId)
        if (flagError) console.error('❌ Failed to update order flags:', flagError)

        // 4. Transition d'état (non bloquante pour le financier déjà enregistré).
        //    Dépôt -> FUNDED ; Solde -> CLOSED. Acteur null -> audit "Système".
        try {
            const target = paymentType === 'DEPOSIT_60' ? 'FUNDED' : 'CLOSED'
            await executeTransition(
                supabase,
                'ORDER',
                orderId,
                target,
                null,
                'ADMIN',
                `Payment confirmed via Stripe (Session: ${session.id})`
            )
            console.log(`✅ Order ${orderId} -> ${target}`)
        } catch (error) {
            console.error(`⚠️ Transition non appliquée pour ${orderId}:`, error)
        }

        // 5. Notifications n8n (déplacées depuis /verify)
        await sendToN8N('payment_confirmed', {
            orderId,
            paymentType,
            amount,
            transactionRef,
            orderReference,
        })

        await sendToN8N('payment_receipt_requested', {
            orderId,
            paymentType,
            amount,
            currency,
            customerEmail: session.customer_details?.email,
            customerName: session.customer_details?.name,
            transactionRef,
            orderReference,
            timestamp: new Date().toISOString(),
        })
    }

    return new NextResponse(null, { status: 200 })
}
