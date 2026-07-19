"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n-context"
import {
  ShoppingCart,
  Search,
  Loader2,
  Calendar,
  Building2,
  ChevronRight,
  CheckCircle2,
  Clock,
  Ship,
  Truck,
  AlertCircle,
  Package,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DashboardHeader } from "@/components/dashboard/header"
import { createClient } from "@/lib/supabase/client"

const statusLabels: Record<string, string> = {
  PENDING: "En attente",
  AWAITING_DEPOSIT: "Acompte requis",
  FUNDED: "Financé",
  SOURCING: "En sourcing",
  EXECUTING: "En exécution",
  PURCHASED: "Acheté",
  AWAITING_BALANCE: "Solde requis",
  SHIPPED: "Expédié",
  DELIVERED: "Livré",
  CLOSED: "Fermé",
  INCIDENT: "Incident",
  FROZEN: "Bloqué",
  CANCELLED: "Annulé",
}

const statusIcon: Record<string, React.ReactNode> = {
  PENDING: <Clock className="w-5 h-5" />,
  AWAITING_DEPOSIT: <AlertCircle className="w-5 h-5" />,
  FUNDED: <CheckCircle2 className="w-5 h-5" />,
  SOURCING: <Search className="w-5 h-5" />,
  EXECUTING: <Package className="w-5 h-5" />,
  PURCHASED: <CheckCircle2 className="w-5 h-5" />,
  AWAITING_BALANCE: <AlertCircle className="w-5 h-5" />,
  SHIPPED: <Ship className="w-5 h-5" />,
  DELIVERED: <Truck className="w-5 h-5" />,
  CLOSED: <CheckCircle2 className="w-5 h-5" />,
  INCIDENT: <AlertCircle className="w-5 h-5" />,
}

const statusColor: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground",
  AWAITING_DEPOSIT: "bg-amber-500/10 text-amber-500",
  FUNDED: "bg-success/10 text-success",
  SOURCING: "bg-primary/10 text-primary",
  EXECUTING: "bg-chart-3/10 text-chart-3",
  PURCHASED: "bg-chart-2/10 text-chart-2",
  AWAITING_BALANCE: "bg-amber-500/10 text-amber-500",
  SHIPPED: "bg-chart-4/10 text-chart-4",
  DELIVERED: "bg-success/10 text-success",
  CLOSED: "bg-muted text-muted-foreground",
  INCIDENT: "bg-destructive/10 text-destructive",
}

export default function DashboardOrdersPage() {
  const { t } = useLanguage()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function fetchOrders() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from("orders")
        .select(`*, import_requests!inner(reference, product_name)`)
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false })

      if (data) setOrders(data)
      setLoading(false)
    }
    fetchOrders()
  }, [])

  const filtered = orders.filter(o =>
    o.reference?.toLowerCase().includes(search.toLowerCase()) ||
    o.import_requests?.reference?.toLowerCase().includes(search.toLowerCase()) ||
    o.import_requests?.product_name?.toLowerCase().includes(search.toLowerCase())
  )

  const pendingDeposit = orders.filter(o => o.status === "AWAITING_DEPOSIT").length

  return (
    <div>
      <DashboardHeader
        title={t("dashboard.orders.title", "Mes Commandes")}
        subtitle={t("dashboard.orders.subtitle", "Suivez l'état de vos commandes d'importation")}
      />

      <div className="p-6">
        {pendingDeposit > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-500">
              {t("dashboard.orders.pending_deposit", "Vous avez {count} commande(s) en attente d'acompte.").replace("{count}", String(pendingDeposit))}
            </p>
          </div>
        )}

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("dashboard.orders.search", "Rechercher par référence ou produit...")}
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-border rounded-2xl">
            <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="font-semibold text-muted-foreground">{t("dashboard.orders.empty", "Aucune commande")}</h3>
            <p className="text-sm text-muted-foreground">{t("dashboard.orders.empty_hint", "Vos commandes apparaîtront après validation de vos demandes.")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((order, i) => (
              <Link key={order.id} href={`/dashboard/requests/${order.request_id}`}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border p-4 rounded-xl hover:bg-accent/50 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusColor[order.status] || "bg-muted"}`}>
                        {statusIcon[order.status] || <Package className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold">{order.import_requests?.product_name || t("dashboard.orders.import", "Importation")}</h3>
                          <Badge className={statusColor[order.status] || ""}>
                            {statusLabels[order.status] || order.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="font-mono">{order.reference || order.import_requests?.reference}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(order.created_at).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold">${order.total_amount?.toLocaleString()}</p>
                        {order.deposit_paid && !order.balance_paid && (
                          <p className="text-[10px] text-amber-500">
                            {t("dashboard.orders.balance_pending", "Solde 40% dû")}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
