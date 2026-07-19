"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n-context"
import {
  Bell,
  Loader2,
  CheckCheck,
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DashboardHeader } from "@/components/dashboard/header"
import { createClient } from "@/lib/supabase/client"
import type { AppNotification } from "@/lib/types"

const iconMap: Record<string, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-success" />,
  info: <Info className="w-5 h-5 text-primary" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  error: <AlertCircle className="w-5 h-5 text-destructive" />,
}

const channelLabel: Record<string, string> = {
  status_change: "Statut",
  document_upload: "Document",
  payment: "Paiement",
  message: "Message",
  incident: "Incident",
  kyc: "KYC",
  system: "Système",
}

export default function NotificationsPage() {
  const { t } = useLanguage()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (data) setNotifications(data as AppNotification[])
      setLoading(false)
    }
    fetch()
  }, [])

  async function markAllRead() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  async function clearAll() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from("notifications").delete().eq("user_id", user.id)
    setNotifications([])
  }

  return (
    <div>
      <DashboardHeader
        title={t("dashboard.notifications.title", "Notifications")}
        subtitle={t("dashboard.notifications.subtitle", "Toutes vos alertes et mises à jour")}
      >
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4" />
            {t("dashboard.notifications.mark_all_read", "Tout marquer lu")}
          </Button>
          <Button variant="outline" size="sm" className="gap-2 text-destructive" onClick={clearAll}>
            <Trash2 className="w-4 h-4" />
            {t("dashboard.notifications.clear_all", "Tout effacer")}
          </Button>
        </div>
      </DashboardHeader>

      <div className="p-6">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-border rounded-2xl">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="font-semibold text-muted-foreground">{t("dashboard.notifications.empty", "Aucune notification")}</h3>
            <p className="text-sm text-muted-foreground">{t("dashboard.notifications.empty_hint", "Vous recevrez des alertes lors des changements de statut, documents, paiements et incidents.")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`p-4 rounded-xl border transition-colors ${
                  n.is_read
                    ? "bg-card border-border"
                    : "bg-primary/5 border-primary/20"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-0.5">{iconMap[n.type] || <Info className="w-5 h-5 text-muted-foreground" />}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`text-sm ${n.is_read ? "font-medium" : "font-bold"}`}>{n.title}</h4>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                        {channelLabel[n.channel] || n.channel}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{n.message}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-muted-foreground/60">
                        {new Date(n.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                        })}
                      </span>
                      {n.link && (
                        <a href={n.link} className="text-[10px] text-primary hover:underline flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> Voir
                        </a>
                      )}
                    </div>
                  </div>
                  {!n.is_read && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
