"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n-context"
import {
  Landmark,
  Search,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Euro,
  Users,
  Activity,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DashboardHeader } from "@/components/dashboard/header"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

type SEPATransaction = {
  id: string
  order_id: string
  type: "DEPOSIT_60" | "BALANCE_40"
  amount: number
  currency: string
  status: "SUCCEEDED" | "FAILED" | "PENDING"
  stripe_payment_intent_id: string
  created_at: string
  metadata: any
  orders?: {
    reference: string
    status: string
    import_requests?: {
      profiles?: {
        email: string
        full_name: string
      }
    }
  }
}

type Mandate = {
  id: string
  full_name: string
  email: string
  iban_last4: string
  bic: string
  mandate_activated: boolean
  created_at: string
}

export default function AdminSepaPage() {
  const { t } = useLanguage()
  const [transactions, setTransactions] = useState<SEPATransaction[]>([])
  const [mandates, setMandates] = useState<Mandate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [retrying, setRetrying] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    Promise.all([fetchTransactions(), fetchMandates()]).finally(() => setLoading(false))
  }, [])

  async function fetchTransactions() {
    const { data } = await supabase
      .from("sepa_payment_transactions")
      .select(`
        *,
        orders!inner(
          reference,
          status,
          import_requests(
            profiles!buyer_id(email, full_name)
          )
        )
      `)
      .order("created_at", { ascending: false })
    if (data) setTransactions(data)
  }

  async function fetchMandates() {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, iban_last4, bic, mandate_activated, created_at")
      .eq("mandate_activated", true)
      .order("created_at", { ascending: false })
    if (data) setMandates(data)
  }

  async function handleRetry(tx: SEPATransaction) {
    setRetrying(tx.id)
    try {
      const res = await fetch("/api/admin/sepa/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: tx.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Relance initiée avec succès")
      fetchTransactions()
    } catch (e: any) {
      toast.error("Échec relance: " + e.message)
    } finally {
      setRetrying(null)
    }
  }

  const succeeded = transactions.filter(t => t.status === "SUCCEEDED")
  const failed = transactions.filter(t => t.status === "FAILED")
  const pending = transactions.filter(t => t.status === "PENDING")
  const succeededAmount = succeeded.reduce((a, t) => a + Number(t.amount), 0)

  const filteredTx = transactions.filter(t => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const order = t.orders
      const profile = (order as any)?.import_requests?.profiles
      return (
        profile?.email?.toLowerCase().includes(q) ||
        profile?.full_name?.toLowerCase().includes(q) ||
        order?.reference?.toLowerCase().includes(q) ||
        t.stripe_payment_intent_id?.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader
        title="Prélèvements SEPA"
        subtitle="Gestion des mandats et transactions de prélèvement automatique"
      />

      <div className="p-6 space-y-8">
        {/* KPIs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <div className="p-5 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center text-success">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Réussis</p>
                <p className="text-xl font-bold">{succeeded.length}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {(succeededAmount / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} prélevés
            </p>
          </div>

          <div className="p-5 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Échoués</p>
                <p className="text-xl font-bold">{failed.length}</p>
              </div>
            </div>
            {failed.length > 0 && (
              <p className="text-xs text-destructive">À relancer</p>
            )}
          </div>

          <div className="p-5 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">En attente</p>
                <p className="text-xl font-bold">{pending.length}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">En cours de traitement</p>
          </div>

          <div className="p-5 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mandats actifs</p>
                <p className="text-xl font-bold">{mandates.length}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Acheteurs avec SEPA activé</p>
          </div>
        </motion.div>

        {/* Mandates Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-border bg-card"
        >
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Mandats SEPA actifs</h2>
              <Badge variant="outline" className="ml-2">{mandates.length}</Badge>
            </div>
          </div>
          {mandates.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Aucun mandat SEPA actif pour le moment
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-muted/30 text-xs font-medium uppercase text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3">Acheteur</th>
                    <th className="px-6 py-3">IBAN</th>
                    <th className="px-6 py-3">BIC</th>
                    <th className="px-6 py-3">Activé le</th>
                    <th className="px-6 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mandates.map((m) => (
                    <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-3">
                        <div className="font-medium">{m.full_name || "N/A"}</div>
                        <div className="text-xs text-muted-foreground">{m.email}</div>
                      </td>
                      <td className="px-6 py-3 font-mono text-sm">•••• {m.iban_last4}</td>
                      <td className="px-6 py-3 font-mono text-sm">{m.bic || "—"}</td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">
                        {new Date(m.created_at).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-6 py-3">
                        <Badge className="bg-success/10 text-success border-success/20">Actif</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Transactions Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-border bg-card"
        >
          <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Transactions</h2>
              <Badge variant="outline" className="ml-2">{transactions.length}</Badge>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  className="w-56 pl-9 pr-3 py-1.5 text-sm rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 outline-none"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select
                className="text-sm rounded-lg bg-background border border-border px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/20"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">Tous</option>
                <option value="SUCCEEDED">Réussis</option>
                <option value="FAILED">Échoués</option>
                <option value="PENDING">En attente</option>
              </select>
              <Button variant="outline" size="sm" onClick={() => { fetchTransactions(); fetchMandates() }}>
                <RefreshCw className="w-4 h-4 mr-1" /> Actualiser
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : filteredTx.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Aucune transaction trouvée</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-muted/30 text-xs font-medium uppercase text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Acheteur</th>
                    <th className="px-6 py-3">Commande</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Stripe ID</th>
                    <th className="px-6 py-3 text-right">Montant</th>
                    <th className="px-6 py-3 text-center">Statut</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTx.map((tx) => {
                    const profile = (tx.orders as any)?.import_requests?.profiles
                    const pct = tx.type === "DEPOSIT_60" ? "Acompte 60%" : "Solde 40%"
                    return (
                      <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-3 text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-6 py-3">
                          <div className="text-sm font-medium">{profile?.full_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{profile?.email || "—"}</div>
                        </td>
                        <td className="px-6 py-3 text-sm font-mono">{tx.orders?.reference || "—"}</td>
                        <td className="px-6 py-3">
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">{pct}</Badge>
                        </td>
                        <td className="px-6 py-3 text-xs font-mono text-muted-foreground max-w-[120px] truncate">
                          {tx.stripe_payment_intent_id || "—"}
                        </td>
                        <td className="px-6 py-3 text-right font-bold font-mono">
                          {(Number(tx.amount) / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                        </td>
                        <td className="px-6 py-3 text-center">
                          {tx.status === "SUCCEEDED" ? (
                            <Badge className="bg-success/10 text-success border-success/20">Succès</Badge>
                          ) : tx.status === "FAILED" ? (
                            <Badge variant="destructive">Échec</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                              <Clock className="w-3 h-3 mr-1" /> En attente
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-3 text-center">
                          {tx.status === "FAILED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={retrying === tx.id}
                              onClick={() => handleRetry(tx)}
                            >
                              {retrying === tx.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3 h-3" />
                              )}
                              <span className="ml-1">Relancer</span>
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
