"use client"

import { useEffect, useState } from "react"
import {
  Wallet,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Lock,
  Unlock,
  Info,
  MoreVertical,
  TrendingUp
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { DashboardHeader } from "@/components/dashboard/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Order, Payment, Profile } from "@/lib/types"

export default function AdminFinancesPage() {
  const [orders, setOrders] = useState<(Order & { buyer: Profile })[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      // 1. Fetch Orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          *,
          request:import_requests(buyer:profiles(*))
        `)
        .order("created_at", { ascending: false })

      if (ordersError) throw ordersError

      const formattedOrders = ordersData.map((item: any) => ({
        ...item,
        buyer: item.request?.buyer
      }))
      setOrders(formattedOrders)

      // 2. Fetch Payments (Real Transactions)
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select(`
            *,
            order:orders(reference)
        `)
        .order("created_at", { ascending: false })

      if (paymentsError) {
        console.error("Error fetching payments:", paymentsError)
        // Don't block the page if payments fail (table might not exist yet?)
      } else {
        setPayments(paymentsData || [])
      }

    } catch (error: any) {
      toast.error("Erreur lors du chargement des finances: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleActivateEscrow(orderId: string) {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          escrow_activated: true,
          status: "FUNDED",
          deposit_paid: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId)

      if (error) throw error

      toast.success("Compte séquestre activé (Acompte 60% confirmé)")
      fetchData()
    } catch (error: any) {
      toast.error("Erreur: " + error.message)
    }
  }

  async function handleConfirmBalance(orderId: string) {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          balance_paid: true,
          status: "SHIPPED",
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId)

      if (error) throw error

      toast.success("Solde 40% confirmé. Commande passée en statut Expédiée.")
      fetchData()
    } catch (error: any) {
      toast.error("Erreur: " + error.message)
    }
  }

  const filteredOrders = orders.filter(order =>
    order.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.buyer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col min-h-screen space-y-8 pb-10">
      <DashboardHeader
        title="Flux Financiers"
        subtitle="Gestion du compte séquestre et historique des transactions"
      />

      <div className="px-6 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Volume Séquestre</p>
                <p className="text-2xl font-bold">
                  {/* Sum of confirmed deposits in orders */}
                  ${orders.filter(o => o.deposit_paid).reduce((acc, curr) => acc + (curr.deposit_amount || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              Fonds sécurisés
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-success/5 border border-success/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center text-success">
                <ArrowUpRight className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Commissions Alpha</p>
                <p className="text-2xl font-bold">
                  ${orders.reduce((acc, curr) => acc + (curr.alpha_commission || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 text-success" />
              Revenus générés
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold">{payments.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="w-3 h-3" />
              Mouvements enregistrés
            </div>
          </div>
        </div>

        {/* SECTION 1: ESCROW MANAGEMENT (ORDERS) */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" /> Gestion des Comptes Séquestres
            </h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filtrer commandes..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-card border border-border focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-muted/50 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Commande</th>
                  <th className="px-6 py-4">Acheteur</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4">Acompte (60%)</th>
                  <th className="px-6 py-4">Solde (40%)</th>
                  <th className="px-6 py-4">Séquestre</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Chargement des données...</td></tr>
                ) : filteredOrders.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Aucune commande active</td></tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-semibold">{order.reference}</span>
                        <div className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {order.buyer?.full_name || "Utilisateur"}
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        ${order.total_amount?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">${order.deposit_amount?.toLocaleString()}</span>
                          {order.deposit_paid ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-amber-400" title="En attente" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">${order.balance_amount?.toLocaleString()}</span>
                          {order.balance_paid ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-gray-300" title="À venir" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {order.escrow_activated ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                            <Lock className="w-3 h-3 mr-1" /> Actif
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground bg-gray-50">
                            <Unlock className="w-3 h-3 mr-1" /> Inactif
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!order.escrow_activated ? (
                          <Button size="sm" onClick={() => handleActivateEscrow(order.id)}>
                            Valider Acompte
                          </Button>
                        ) : !order.balance_paid ? (
                          <Button size="sm" variant="secondary" onClick={() => handleConfirmBalance(order.id)}>
                            Valider Solde
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" disabled>
                            Terminé
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 2: REAL TRANSACTIONS (PAYMENTS TABLE) */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" /> Historique des Paiements Réels
          </h2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Référence Commande</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>ID Transaction (Stripe)</TableHead>
                    <TableHead className="text-right">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Aucune transaction enregistrée pour le moment.
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{new Date(payment.created_at).toLocaleDateString()}</span>
                            <span className="text-xs text-muted-foreground">{new Date(payment.created_at).toLocaleTimeString()}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {payment.order?.reference || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {payment.type === 'DEPOSIT_60' ? 'Acompte (60%)' : 'Solde (40%)'}
                        </TableCell>
                        <TableCell className="font-bold">
                          {payment.amount?.toLocaleString()} {payment.currency?.toUpperCase()}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {payment.transaction_ref || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className={payment.status === 'RELEASED' ? "bg-green-100 text-green-700" : ""}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
