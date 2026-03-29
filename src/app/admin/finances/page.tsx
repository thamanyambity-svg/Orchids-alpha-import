"use client"

import { useEffect, useState } from "react"
import {
  Wallet,
  Search,
  ShieldCheck,
  Clock,
  TrendingUp
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { DashboardHeader } from "@/components/dashboard/header"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

export default function AdminFinancesPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const supabase = createClient()

  useEffect(() => {
    fetchTransactions()
  }, [])

  async function fetchTransactions() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
                    *,
                    user:profiles(full_name, email),
                    order:orders(reference)
                `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (error: any) {
      toast.error("Erreur chargement finances: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  // KPIs
  const totalVolume = transactions
    .filter(t => t.status === 'SUCCEEDED')
    .reduce((acc, curr) => acc + Number(curr.amount), 0)

  const _pendingCount = transactions.filter(t => t.status === 'PENDING').length

  // Filtering
  const filteredTx = transactions.filter(t =>
    t.stripe_payment_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.order?.reference?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader
        title="Flux Financiers (Réel)"
        subtitle="Grand Livre des paiements Stripe & Séquestre"
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Volume Encaissé</p>
                <p className="text-2xl font-bold">${totalVolume.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              Depuis Stripe (Live/Test)
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-success/5 border border-success/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center text-success">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Commissions (Est.)</p>
                <p className="text-2xl font-bold">${(totalVolume * 0.1).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 text-success" />
              10% du volume global
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher (Stripe ID, Nom)..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-card border border-border focus:ring-2 focus:ring-primary/20 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-muted/50 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Utilisateur</th>
                <th className="px-6 py-4">Commande</th>
                <th className="px-6 py-4">Stripe ID</th>
                <th className="px-6 py-4 text-right">Montant</th>
                <th className="px-6 py-4 text-right">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center">Chargement...</td></tr>
              ) : filteredTx.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Aucune transaction trouvée</td></tr>
              ) : (
                filteredTx.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="uppercase text-[10px]">{tx.type}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {tx.user?.full_name || tx.user?.email || 'Inconnu'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {tx.order?.reference || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                      {tx.stripe_payment_id || '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-bold">
                      ${Number(tx.amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {tx.status === 'SUCCEEDED' ? (
                        <Badge className="bg-success/10 text-success border-success/20">Succès</Badge>
                      ) : (
                        <Badge variant="destructive">Échec</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
