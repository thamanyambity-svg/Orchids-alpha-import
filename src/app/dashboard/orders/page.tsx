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
import { PaymentProofDialog } from "@/components/dashboard/payment-proof-dialog"
import { REQUEST_STATUS, statusBadge, statusLabel } from "@/lib/design/status"


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


type Proof = {
  id: string
  order_id: string
  status: "PENDING_REVIEW" | "ACCEPTED" | "REJECTED" | "SUPERSEDED"
  rejected_reason: string | null
}

const proofBadge: Record<Proof["status"], { label: string; className: string }> = {
  PENDING_REVIEW: { label: "Justificatif en vérification", className: "bg-warning/10 text-warning" },
  ACCEPTED: { label: "Justificatif validé", className: "bg-success/10 text-success" },
  REJECTED: { label: "Justificatif refusé", className: "bg-destructive/10 text-destructive" },
  SUPERSEDED: { label: "Justificatif remplacé", className: "bg-muted text-muted-foreground" },
}

export default function DashboardOrdersPage() {
  const { t } = useLanguage()
  const [orders, setOrders] = useState<any[]>([])
  const [proofs, setProofs] = useState<Proof[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    async function fetchOrders() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // `orders` ne porte pas de buyer_id : le propriétaire se lit sur la demande
      // d'origine. Filtrer sur orders.buyer_id renvoyait une erreur PostgREST, et
      // la page restait vide quoi qu'il arrive.
      const { data, error } = await supabase
        .from("orders")
        .select(`*, import_requests!inner(reference, product_name, buyer_id)`)
        .eq("import_requests.buyer_id", user.id)
        .order("created_at", { ascending: false })

      if (error) console.error("[dashboard/orders]", error)
      if (data) setOrders(data)

      const proofRes = await fetch("/api/payment-proofs")
      if (proofRes.ok) {
        const { proofs } = await proofRes.json()
        setProofs(proofs ?? [])
      }

      setLoading(false)
    }
    fetchOrders()
  }, [reloadKey])

  const filtered = orders.filter(o =>
    o.reference?.toLowerCase().includes(search.toLowerCase()) ||
    o.import_requests?.reference?.toLowerCase().includes(search.toLowerCase()) ||
    o.import_requests?.product_name?.toLowerCase().includes(search.toLowerCase())
  )

  // L'API renvoie les dépôts du plus récent au plus ancien : le premier qui n'est
  // pas remplacé est celui qui fait foi pour la commande.
  const currentProof = (orderId: string) =>
    proofs.find(p => p.order_id === orderId && p.status !== "SUPERSEDED")

  const pendingDeposit = orders.filter(o => o.status === "AWAITING_DEPOSIT").length

  return (
    <div>
      <DashboardHeader
        title={t("dashboard.orders.title", "Mes Commandes")}
        subtitle={t("dashboard.orders.subtitle", "Suivez l'état de vos commandes d'importation")}
      />

      <div className="p-6">
        {pendingDeposit > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-warning/10 border border-warning/20 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
            <p className="text-sm text-warning">
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
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border p-4 rounded-xl transition-colors group"
              >
                  <div className="flex items-center justify-between gap-4">
                    <Link
                      href={`/dashboard/requests/${order.request_id}`}
                      className="flex min-w-0 flex-1 items-center gap-4"
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusBadge(REQUEST_STATUS, order.status)}`}>
                        {statusIcon[order.status] || <Package className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold">{order.import_requests?.product_name || t("dashboard.orders.import", "Importation")}</h3>
                          <Badge className={statusBadge(REQUEST_STATUS, order.status)}>
                            {statusLabel(REQUEST_STATUS, order.status, t)}
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
                    </Link>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold">${order.total_amount?.toLocaleString()}</p>
                        {order.deposit_paid && !order.balance_paid && (
                          <p className="text-[10px] text-warning">
                            {t("dashboard.orders.balance_pending", "Solde 40% dû")}
                          </p>
                        )}
                      </div>
                      <PaymentProofDialog
                        orderId={order.id}
                        orderReference={order.reference}
                        supersedesProofId={
                          currentProof(order.id)?.status === "REJECTED"
                            ? currentProof(order.id)?.id
                            : undefined
                        }
                        onUploaded={() => setReloadKey(k => k + 1)}
                      />
                      <Link href={`/dashboard/requests/${order.request_id}`} aria-label={t("dashboard.orders.open", "Ouvrir la commande")}>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>

                  {(() => {
                    const proof = currentProof(order.id)
                    if (!proof) return null
                    const badge = proofBadge[proof.status]
                    return (
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                        <Badge className={badge.className}>{badge.label}</Badge>
                        {proof.status === "REJECTED" && proof.rejected_reason && (
                          <span className="text-xs text-muted-foreground">{proof.rejected_reason}</span>
                        )}
                      </div>
                    )
                  })()}
                </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
