import { NextRequest, NextResponse } from 'next/server'
import { requireUser, handleApiError } from '@/lib/auth-guard'
import { confirmDirectDebitMandate } from '@/lib/payments/auto-debit.service'

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Un corps illisible est une faute de l'appelant : sans ce filet il
    // ressortait en 500, ce qui envoie chercher un incident inexistant.
    let body: { setupIntentId?: unknown }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // La forme est contrôlée avant l'appel : l'identifiant part tel quel chez
    // Stripe, et une valeur d'un autre type d'objet (pm_, cus_) y déclencherait
    // une erreur générique qu'on rendrait en 500 au lieu d'un refus net.
    const setupIntentId = body?.setupIntentId
    if (typeof setupIntentId !== 'string' || !/^seti_[A-Za-z0-9_]{4,}$/.test(setupIntentId)) {
      return NextResponse.json(
        { error: 'setupIntentId is required' },
        { status: 400 }
      )
    }

    // Confirmer le mandat et sauvegarder
    const result = await confirmDirectDebitMandate(user.id, setupIntentId)

    return NextResponse.json({
      success: true,
      message: 'SEPA mandate activated successfully',
      paymentMethod: {
        id: result.paymentMethodId,
        lastFour: result.lastFour,
        bic: result.bic
      }
    })
  } catch (error: unknown) {
    console.error('Confirm mandate error:', error)
    return handleApiError(error)
  }
}
