import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { setupDirectDebitMandate } from '@/lib/payments/auto-debit.service'
import { validateIBAN, validateBIC } from '@/lib/payments/iban-validator'

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
    const { iban, bic } = body

    if (!iban || !bic) {
      return NextResponse.json(
        { error: 'IBAN and BIC are required' },
        { status: 400 }
      )
    }

    // Validation préalable côté client
    const ibanValidation = validateIBAN(iban)
    if (!ibanValidation.valid) {
      return NextResponse.json(
        { error: ibanValidation.error },
        { status: 400 }
      )
    }

    if (!validateBIC(bic)) {
      return NextResponse.json(
        { error: 'Invalid BIC format' },
        { status: 400 }
      )
    }

    // Récupérer les infos du profil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Récupérer l'IP du client
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]
      || req.headers.get('x-real-ip')
      || '127.0.0.1'

    // Créer le SetupIntent
    const result = await setupDirectDebitMandate(
      user.id,
      iban,
      bic,
      profile.email || user.email || '',
      profile.full_name || 'Client',
      clientIp
    )

    return NextResponse.json({
      success: true,
      clientSecret: result.clientSecret,
      customerId: result.customerId,
      message: 'SEPA mandate setup initiated. Please confirm in the payment form.'
    })
  } catch (error: any) {
    console.error('Setup mandate error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to setup mandate' },
      { status: 500 }
    )
  }
}
