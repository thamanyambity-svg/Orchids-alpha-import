import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { requireUser, handleApiError, ApiError } from '@/lib/auth-guard'

/**
 * LECTURE SEULE.
 * Sert uniquement à la page de retour (/payment/success) pour afficher la
 * confirmation. La source de vérité financière (transactions, payments, flags,
 * transition d'état) est gérée EXCLUSIVEMENT par le webhook Stripe
 * (/api/webhooks/stripe). Cette route n'écrit RIEN.
 */
export async function GET(request: NextRequest) {
  try {
    // Auth requise + client SSR (RLS) pour le contrôle d'appartenance.
    const { supabase } = await requireUser()

    const sessionId = request.nextUrl.searchParams.get('session_id')
    if (!sessionId) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    const orderId = session.metadata?.orderId
    const paymentType = session.metadata?.paymentType as 'DEPOSIT_60' | 'BALANCE_40' | undefined
    const orderReference = session.metadata?.orderReference

    if (!orderId || !paymentType) {
      return NextResponse.json({ error: 'Invalid session metadata' }, { status: 400 })
    }

    // Contrôle d'appartenance : la commande doit être visible par l'utilisateur via RLS.
    const { data: ownedOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .maybeSingle()

    if (!ownedOrder) {
      throw new ApiError(403, 'Forbidden: order not accessible')
    }

    return NextResponse.json({
      orderReference,
      paymentType,
      amount: session.amount_total,
      status: session.payment_status,
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
