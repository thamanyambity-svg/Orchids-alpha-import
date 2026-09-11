"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n-context"
import { Bell, AlertTriangle, MessageSquare, Mail, Activity, ChevronRight } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export function NotificationCenter() {
  const { t } = useLanguage()
  const [data, setData] = useState<{
    total: number
    items: { type: string; count: number; label: string; href: string }[]
  } | null>(null)

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch("/api/admin/notifications")
        // Session perdue ou remplacée par un autre compte dans ce navigateur :
        // inutile d'insister chaque minute, la garde d'espace prend le relais.
        if (res.status === 401 || res.status === 403) {
          clearInterval(interval)
          return
        }
        const json = await res.json()
        if (!json.error) setData(json)
      } catch {
        // Ignorer
      }
    }
    const interval = setInterval(fetchNotifications, 60000) // Refresh every minute
    fetchNotifications()
    return () => clearInterval(interval)
  }, [])

  const total = data?.total ?? 0
  const items = data?.items ?? []

  const iconMap: Record<string, React.ReactNode> = {
    incident: <AlertTriangle className="w-4 h-4 text-warning" />,
    message: <MessageSquare className="w-4 h-4 text-info" />,
    contact: <Mail className="w-4 h-4 text-primary" />,
    audit: <Activity className="w-4 h-4 text-muted-foreground" />,
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-foreground/70 hover:text-foreground hover:bg-foreground/5"
        >
          <Bell className="w-5 h-5" />
          {total > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-warning text-[10px] font-bold text-foreground flex items-center justify-center">
              {total > 99 ? "99+" : total}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72" sideOffset={8}>
        <div className="px-3 py-2 border-b">
          <p className="text-sm font-semibold">{t("admin.notifications.title", "Notifications")}</p>
          <p className="text-xs text-muted-foreground">
            {total === 0 ? t("admin.notifications.no_alerts", "Aucune alerte") : `${total} ${t("admin.notifications.alert", "alerte")}${total > 1 ? "s" : ""} ${t("admin.notifications.to_process", "à traiter")}`}
          </p>
        </div>
        {items.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {t("admin.notifications.all_clear", "Tout est à jour")}
          </div>
        ) : (
          items.map((item) => (
            <DropdownMenuItem key={`${item.type}-${item.href}`} asChild>
              <Link
                href={item.href}
                className="flex items-center gap-3 p-3 cursor-pointer"
              >
                {iconMap[item.type] ?? <Activity className="w-4 h-4" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.count} {t("admin.notifications.items_suffix", "élément(s)")}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/admin/reporting" className="text-center justify-center text-xs text-muted-foreground">
            {t("admin.notifications.see_all", "Voir tout")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
