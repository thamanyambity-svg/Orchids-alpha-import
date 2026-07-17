"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n-context"
import {
  Package,
  Search,
  Loader2,
  Calendar,
  Filter,
  Download,
  ChevronRight,
  CheckCircle2,
  Clock,
  Ship,
  Truck,
  AlertCircle,
  User,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

const statusColor: Record<string, string> = {
  PENDING: "bg-white/10 text-white/60",
  AWAITING_DEPOSIT: "bg-amber-500/10 text-amber-500",
  FUNDED: "bg-success/10 text-success",
  SOURCING: "bg-primary/10 text-primary",
  EXECUTING: "bg-chart-3/10 text-chart-3",
  PURCHASED: "bg-chart-2/10 text-chart-2",
  AWAITING_BALANCE: "bg-amber-500/10 text-amber-500",
  SHIPPED: "bg-chart-4/10 text-chart-4",
  DELIVERED: "bg-success/10 text-success",
  CLOSED: "bg-white/10 text-white/60",
  INCIDENT: "bg-destructive/10 text-destructive",
}

export default function AdminOrdersPage() {
  const { t } = useLanguage()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    async function fetchOrders() {
      const supabase = createClient()
      const { data } = await supabase
        .from("orders")
        .select(`*, import_requests(reference, product_name)`)
        .order("created_at", { ascending: false })

      if (data) setOrders(data)
      setLoading(false)
    }
    fetchOrders()
  }, [])

  const filtered = orders.filter(o => {
    const matchSearch = o.reference?.toLowerCase().includes(search.toLowerCase()) ||
      o.import_requests?.reference?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || o.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
  const activeOrders = orders.filter(o => !["CLOSED", "CANCELLED", "DELIVERED"].includes(o.status)).length

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">{t("admin.orders.title", "Commandes")}</h1>
        <p className="text-white/40 text-sm">{t("admin.orders.subtitle", "Gérez l'ensemble des commandes d'importation")}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">{t("admin.orders.total", "Total commandes")}</p>
          <p className="text-2xl font-bold text-white">{orders.length}</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">{t("admin.orders.active", "En cours")}</p>
          <p className="text-2xl font-bold text-[#ffd700]">{activeOrders}</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">{t("admin.orders.revenue", "Volume total")}</p>
          <p className="text-2xl font-bold text-success">${totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            placeholder={t("admin.orders.search", "Rechercher...")}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.orders.all", "Tous")}</SelectItem>
            {Object.entries(statusLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#ffd700]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-white/10 rounded-2xl">
          <Package className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="font-semibold text-white/50">{t("admin.orders.empty", "Aucune commande")}</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order, i) => (
            <Link key={order.id} href={`/admin/requests/${order.request_id}`}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/[0.07] transition-colors group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#ffd700]/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-[#ffd700]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-white">{order.import_requests?.product_name || "Importation"}</span>
                        <Badge className={statusColor[order.status] || ""}>
                          {statusLabels[order.status] || order.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/40">
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
                    <span className="text-lg font-bold text-white">${order.total_amount?.toLocaleString()}</span>
                    <ChevronRight className="w-5 h-5 text-white/20 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
