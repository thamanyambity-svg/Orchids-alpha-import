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
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"

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

export default function AdminNotificationsPage() {
  const { t } = useLanguage()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const supabase = createClient()
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })

      if (data) setNotifications(data)
      setLoading(false)
    }
    fetch()
  }, [])

  async function markAllRead() {
    const supabase = createClient()
    await supabase.from("notifications").update({ is_read: true }).eq("is_read", false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  async function clearAll() {
    const supabase = createClient()
    await supabase.from("notifications").delete().neq("id", "none")
    setNotifications([])
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">{t("admin.notifications.page_title", "Notifications")}</h1>
          <p className="text-white/40 text-sm">{t("admin.notifications.page_subtitle", "Toutes les notifications système")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-white/10 text-white/70 gap-2" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4" />
            {t("admin.notifications.mark_all_read", "Tout marquer lu")}
          </Button>
          <Button variant="outline" size="sm" className="border-white/10 text-destructive/70 gap-2" onClick={clearAll}>
            <Trash2 className="w-4 h-4" />
            {t("admin.notifications.clear_all", "Tout effacer")}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#ffd700]" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-white/10 rounded-2xl">
          <Bell className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="font-semibold text-white/50">{t("admin.notifications.empty", "Aucune notification")}</h3>
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
                  ? "bg-white/5 border-white/10"
                  : "bg-[#ffd700]/5 border-[#ffd700]/20"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="mt-0.5">{iconMap[n.type] || <Info className="w-5 h-5 text-white/40" />}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`text-sm text-white ${n.is_read ? "font-medium" : "font-bold"}`}>{n.title}</h4>
                    <Badge variant="outline" className="border-white/20 text-white/60 text-[10px]">
                      {channelLabel[n.channel] || n.channel}
                    </Badge>
                  </div>
                  <p className="text-xs text-white/50">{n.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-white/30">
                      {new Date(n.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                      })}
                    </span>
                    <span className="text-[10px] text-white/30">— {n.user_id?.slice(0, 8)}...</span>
                    {n.link && (
                      <a href={n.link} className="text-[10px] text-[#ffd700] hover:underline flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> Voir
                      </a>
                    )}
                  </div>
                </div>
                {!n.is_read && (
                  <div className="w-2 h-2 rounded-full bg-[#ffd700] mt-2 flex-shrink-0" />
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
