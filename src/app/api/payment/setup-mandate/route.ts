import { NextRequest, NextResponse } from 'next/server'
import { requireUser, handleApiError } from '@/lib/auth-guard'
import { setupDirectDebitMandate } from '@/lib/payments/auto-debit.service'
import { validateIBAN, validateBIC } from '@/lib/payments/iban-validator'

export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await requireUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Un corps illisible est une faute de l'appelant, pas une panne du
    // serveur : sans ce filet il ressortait en 500, ce qui envoie chercher un
    // incident inexistant.
    let body: { iban?: unknown; bic?: unknown }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const iban = typeof body?.iban === 'string' ? body.iban : ''
    const bic = typeof body?.bic === 'string' ? body.bic : ''

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
  } catch (error: unknown) {
    console.error('Setup mandate error:', error)
    return handleApiError(error)
  }
}
