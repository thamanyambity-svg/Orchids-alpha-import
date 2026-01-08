import { Resend } from 'resend'
import { RequestStatus, OrderStatus } from './types'

const resend = new Resend(process.env.RESEND_API_KEY)

// We'll use a verified sender or a test one.
// For Resend testing, you usually must send to your own email unless you verify a domain.
// We'll try to use a generic sender.
const SENDER_EMAIL = 'Alpha Import <onboarding@resend.dev>'

type NotificationType = RequestStatus | OrderStatus

const SUBJECTS: Partial<Record<NotificationType, string>> = {
    // Request Workflow
    'VALIDATED': 'Action Requis : Votre devis Alpha Import est validé ✅',
    'REJECTED': 'Mise à jour concernant votre demande Alpha Import ❌',

    // Order Workflow
    'FUNDED': 'Paiement reçu : Votre commande est en route ! 🚀',
    'PURCHASED': 'Bonne nouvelle : Vos marchandises sont achetées 📦',
    'SHIPPED': 'Expédition confirmée : Votre commande voyage 🚢',
    'DELIVERED': 'Livraison effectuée avec succès 🎉',
    'AWAITING_BALANCE': 'Rappel : Solde à régler pour livraison finale 💰'
}

const TEMPLATES: Partial<Record<NotificationType, (name: string) => string>> = {
    'VALIDATED': (name) => `
        <h1>Bonjour ${name},</h1>
        <p>Excellente nouvelle ! L'équipe Alpha Import a analysé et validé votre demande.</p>
        <p><strong>Prochaine étape :</strong> Connectez-vous à votre espace client pour consulter le devis final et procéder au versement de l'acompte de 60%.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accéder à mon Espace</a>
        </div>
    `,
    'FUNDED': (name) => `
        <h1>Paiement confirmé, ${name} ! 💸</h1>
        <p>Nous avons bien reçu votre acompte de 60%. La sécurisation des fonds est active.</p>
        <p>Nos équipes lancent immédiatement le sourcing et l'achat de vos marchandises.</p>
        <p>Vous serez notifié à chaque étape clé.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Voir ma commande</a>
        </div>
    `,
    'SHIPPED': (name) => `
        <h1>Votre commande est en route 🚢</h1>
        <p>Bonjour ${name},</p>
        <p>Votre partenaire logistique nous a confirmé l'expédition de vos marchandises.</p>
        <p>Vous pouvez suivre le statut et voir les documents d'expédition (Bill of Lading) directement sur votre tableau de bord.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Suivre l'expédition</a>
        </div>
    `,
    'DELIVERED': (name) => `
        <h1>Livraison confirmée 🎉</h1>
        <p>Bonjour ${name},</p>
        <p>Votre commande est bien arrivée à destination.</p>
        <p>Nous espérons que vous êtes satisfait de votre expérience avec Alpha Import.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="border: 1px solid #e4e4e7; color: #18181b; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Laisser un avis</a>
        </div>
    `,
    'REJECTED': (name) => `
        <h1>Mise à jour de votre demande</h1>
        <p>Bonjour ${name},</p>
        <p>Après analyse approfondie, nous ne pouvons malheureusement pas donner suite à votre demande d'importation sous sa forme actuelle.</p>
        <p><strong>Raison possible :</strong> Contraintes logistiques, budget irréaliste ou produit non conforme.</p>
        <p>Nous vous invitons à consulter les détails dans votre espace ou à nous contacter pour ajuster les critères.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Voir les détails</a>
        </div>
    `,
    'PURCHASED': (name) => `
        <h1>Marchandises Achetées ! 📦</h1>
        <p>Bonjour ${name},</p>
        <p>Bonne nouvelle : Nos équipes ont finalisé l'achat de vos produits.</p>
        <p>Ils sont maintenant en route vers notre entrepôt pour le contrôle qualité et la préparation à l'expédition.</p>
        <p>Vous recevrez une notification dès que l'expédition maritime/aérienne aura commencé.</p>
        <div style="text-align: center; margin: 30px 0;">
             <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Suivre ma commande</a>
        </div>
    `,
    'AWAITING_BALANCE': (name) => `
        <h1>La livraison approche ! 🚚</h1>
        <p>Bonjour ${name},</p>
        <p>Vos marchandises sont arrivées et dédouanées. Elles sont prêtes à vous être livrées.</p>
        <p><strong>Action requise :</strong> Veuillez régler le solde restant (40%) pour débloquer la livraison finale à votre adresse.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Payer le solde</a>
        </div>
    `
}

export async function sendStatusNotification(
    toEmail: string,
    userName: string,
    status: NotificationType,
    orderId?: string
) {
    // Only send if we have a template and subject for this status
    const subject = SUBJECTS[status]
    const templateFn = TEMPLATES[status]

    if (!subject || !templateFn) {
        console.log(`ℹ️ No notification template for status ${status}. Skipping email.`)
        return
    }

    // Professional HTML Wrapper
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                
                <!-- Header -->
                <div style="background-color: #09090b; padding: 24px; text-align: center;">
                    <div style="color: #ffffff; font-size: 24px; font-weight: bold; letter-spacing: -0.5px;">
                        ALPHA <span style="color: #3b82f6;">IMPORT</span>
                    </div>
                </div>

                <!-- Content -->
                <div style="padding: 40px 32px; color: #18181b; line-height: 1.6;">
                    ${templateFn(userName)}
                </div>

                <!-- Footer -->
                <div style="background-color: #fafafa; padding: 24px; text-align: center; border-top: 1px solid #e4e4e7;">
                    <p style="font-size: 12px; color: #71717a; margin: 0;">
                        Ceci est un message automatique de la plateforme Alpha Import Exchange.<br>
                        Kinshasa, RDC • Guangzhou, Chine
                    </p>
                </div>
            </div>
        </body>
        </html>
    `

    try {
        if (!process.env.RESEND_API_KEY) {
            console.log('⚠️ RESEND_API_KEY missing. Simulating email sent:', { to: toEmail, subject })
            return
        }

        const data = await resend.emails.send({
            from: SENDER_EMAIL,
            to: toEmail,
            subject: subject,
            html: htmlContent
        })

        if (data.error) {
            console.error('❌ Resend Error:', data.error)
        } else {
            console.log(`✅ Email sent to ${toEmail} [${status}] ID: ${data.data?.id}`)
        }

    } catch (error) {
        console.error('❌ Failed to send email notification:', error)
    }
}
