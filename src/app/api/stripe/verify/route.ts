import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/reporting/auth'

/**
 * LECTURE SEULE.
 * Sert à la page de retour (/payment/success) pour afficher la confirmation.
 * La source de vérité financière (transactions, payments, flags, transition) est
 * gérée EXCLUSIVEMENT par le webhook Stripe (/api/webhooks/stripe). Cette route
 * n'écrit RIEN.
 */
export async function GET(request: NextRequest) {
  // Auth requise + client SSR (RLS) pour le contrôle d'appartenance.
  const auth = await getSessionUser()
  if (auth instanceof NextResponse) return auth

  const supabase = await createClient()

  try {
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
      return NextResponse.json({ error: 'Accès refusé — commande non accessible.' }, { status: 403 })
    }

    return NextResponse.json({
      orderReference,
      paymentType,
      amount: session.amount_total,
      status: session.payment_status,
    })
  } catch (error) {
    console.error('Payment verification error:', error)
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 })
  }
}
