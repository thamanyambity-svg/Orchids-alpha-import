import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { confirmDirectDebitMandate } from '@/lib/payments/auto-debit.service'

export async function POST(req: NextRequest) {
  try {
    // Authentifier l'utilisateur
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parser le body
    const body = await req.json()
    const { setupIntentId } = body

    if (!setupIntentId) {
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
  } catch (error: any) {
    console.error('Confirm mandate error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to confirm mandate' },
      { status: 500 }
    )
  }
}
