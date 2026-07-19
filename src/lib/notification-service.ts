import { createClient } from "@supabase/supabase-js"
import type { NotificationChannel, NotificationType } from "@/lib/types"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function sendNotification(params: {
  userId: string
  channel: NotificationChannel
  type: NotificationType
  title: string
  message: string
  link?: string
}) {
  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    channel: params.channel,
    type: params.type,
    title: params.title,
    message: params.message,
    link: params.link || null,
    is_read: false,
  })

  if (error) console.error("Failed to send notification:", error)
  return !error
}

export function notificationForEvent(event: string, data: any) {
  const configs: Record<string, { channel: NotificationChannel; type: NotificationType; title: (d: any) => string; message: (d: any) => string }> = {
    request_validated: {
      channel: "status_change",
      type: "success",
      title: (d) => `Demande validée — ${d.reference}`,
      message: (d) => `Votre demande ${d.reference} a été validée. Le partenaire ${d.partner} va commencer l'exécution.`,
    },
    request_rejected: {
      channel: "status_change",
      type: "error",
      title: (d) => `Demande refusée — ${d.reference}`,
      message: (d) => `Votre demande ${d.reference} n'a pas été retenue. Motif : ${d.reason || "Non spécifié"}.`,
    },
    order_shipped: {
      channel: "status_change",
      type: "info",
      title: (d) => `Commande expédiée — ${d.reference}`,
      message: (d) => `Votre commande ${d.reference} est en transit. Suivi tracking disponible.`,
    },
    order_delivered: {
      channel: "status_change",
      type: "success",
      title: (d) => `Livraison confirmée — ${d.reference}`,
      message: (d) => `Votre commande ${d.reference} est arrivée à destination.`,
    },
    deposit_paid: {
      channel: "payment",
      type: "success",
      title: (d) => `Acompte reçu — ${d.reference}`,
      message: (d) => `Votre acompte de $${d.amount} a été confirmé. L'exécution peut commencer.`,
    },
    balance_paid: {
      channel: "payment",
      type: "success",
      title: (d) => `Solde reçu — ${d.reference}`,
      message: (d) => `Votre paiement du solde de $${d.amount} a été confirmé.`,
    },
    document_uploaded: {
      channel: "document_upload",
      type: "info",
      title: (d) => `Document ajouté — ${d.reference}`,
      message: (d) => `${d.document_name} a été téléversé pour la demande ${d.reference}.`,
    },
    incident_opened: {
      channel: "incident",
      type: "warning",
      title: (d) => `Incident déclaré — ${d.reference}`,
      message: (d) => `Un incident a été ouvert : ${d.description}.`,
    },
    message_received: {
      channel: "message",
      type: "info",
      title: (d) => `Nouveau message — ${d.sender}`,
      message: (d) => `${d.sender} vous a envoyé un message : "${d.preview}"`,
    },
    kyc_verified: {
      channel: "kyc",
      type: "success",
      title: () => "KYC vérifié",
      message: () => "Vos documents KYC ont été vérifiés avec succès.",
    },
    kyc_rejected: {
      channel: "kyc",
      type: "error",
      title: () => "KYC refusé",
      message: (d) => `Vos documents KYC ont été refusés. Motif : ${d.reason || "Documents non conformes"}.`,
    },
  }

  return configs[event] || null
}

export async function notifyOnEvent(event: string, userId: string, data: any) {
  const config = notificationForEvent(event, data)
  if (!config) return false

  return sendNotification({
    userId,
    channel: config.channel,
    type: config.type,
    title: config.title(data),
    message: config.message(data),
    link: data.link,
  })
}
