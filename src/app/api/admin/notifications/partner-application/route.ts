import { NextRequest, NextResponse } from 'next/server'
import { requireRole, handleApiError } from '@/lib/auth-guard'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY || '')
const SENDER_EMAIL = 'A.Onoseke Investment <contact@aonosekehouseinvestmentdrc.site>'

export async function POST(req: NextRequest) {
  try {
    await requireRole(['ADMIN'])

    const { applicationId, status, email, companyName } = await req.json()

    if (!applicationId || !status || !email || !companyName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const isApproved = status === 'APPROVED_KYC'
    const subject = isApproved
      ? 'Candidature Partenaire Approuvée - Alpha Import'
      : 'Mise à jour de votre candidature Partenaire'

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <div style="background-color: #09090b; padding: 24px; text-align: center;">
            <div style="color: #ffffff; font-size: 24px; font-weight: bold; letter-spacing: -0.5px;">
              A.ONOSEKE <span style="color: #3b82f6;">INVESTMENT</span>
            </div>
          </div>
          <div style="padding: 40px 32px; color: #18181b; line-height: 1.6;">
            ${isApproved ? `
              <h1>Félicitations, ${companyName} !</h1>
              <p>Nous avons le plaisir de vous informer que votre candidature en tant que partenaire <strong>Alpha Import</strong> a été approuvée après vérification KYC.</p>
              <p><strong>Prochaines étapes :</strong></p>
              <ol>
                <li>Connectez-vous à votre espace partenaire</li>
                <li>Configurez vos fournisseurs et services</li>
                <li>Commencez à recevoir des demandes d'importation</li>
              </ol>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/partner" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accéder à mon espace</a>
              </div>
            ` : `
              <h1>Mise à jour de votre candidature</h1>
              <p>Bonjour,</p>
              <p>Après examen approfondi, nous ne pouvons malheureusement pas approuver votre candidature en l'état actuel.</p>
              <p>Notre équipe reste à votre disposition pour échanger sur les possibilités d'amélioration de votre dossier.</p>
              <p>Vous pouvez soumettre une nouvelle candidature à tout moment.</p>
            `}
          </div>
          <div style="background-color: #fafafa; padding: 24px; text-align: center; border-top: 1px solid #e4e4e7;">
            <p style="font-size: 12px; color: #71717a; margin: 0;">
              Ceci est un message automatique de la plateforme A.Onoseke Investment.<br>
              Kinshasa, RDC • Guangzhou, Chine
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    if (process.env.RESEND_API_KEY) {
      const { error } = await resend.emails.send({
        from: SENDER_EMAIL,
        to: email,
        subject,
        html,
      })
      if (error) console.error('Failed to send partner notification email:', error)
    } else {
      console.log(`[SIMULATION] Email to ${email}: ${subject}`)
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
