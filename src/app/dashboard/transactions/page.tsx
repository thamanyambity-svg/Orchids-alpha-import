"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  CircleDollarSign, 
  Search, 
  Filter, 
  ArrowUpRight, 
  Loader2,
  Calendar,
  CheckCircle2,
  Clock
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DashboardHeader } from "@/components/dashboard/header"
import { createClient } from "@/lib/supabase/client"

export default function TransactionsPage() {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    async function fetchTransactions() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data } = await supabase
          .from("payments")
          .select(`
            *,
            import_requests (product_name, reference)
          `)
          .eq("buyer_id", user.id)
          .order("created_at", { ascending: false })
        
        if (data) setTransactions(data)
      }
      setLoading(false)
    }
    fetchTransactions()
  }, [])

  const filteredTransactions = transactions.filter(t => 
    t.import_requests?.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.import_requests?.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.stripe_payment_intent_id?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div>
      <DashboardHeader 
        title="Transactions" 
        subtitle="Historique de vos paiements et mouvements financiers"
      />

      <div className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher par référence ou produit..." 
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="payment">Paiements</SelectItem>
              <SelectItem value="refund">Remboursements</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card border border-border p-4 rounded-xl hover:bg-accent/50 transition-colors group"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      transaction.status === 'succeeded' ? 'bg-success/10 text-success' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {transaction.status === 'succeeded' ? <ArrowUpRight className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="font-bold">{transaction.import_requests?.product_name || "Paiement Service"}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono uppercase">{transaction.import_requests?.reference || "REF-ID-" + transaction.id.slice(0, 5)}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xl font-bold">${transaction.amount?.toLocaleString()}</p>
                    <div className={`flex items-center gap-1 text-[10px] font-bold uppercase justify-end ${
                      transaction.status === 'succeeded' ? 'text-success' : 'text-amber-500'
                    }`}>
                      {transaction.status === 'succeeded' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      {transaction.status === 'succeeded' ? 'Complété' : 'En attente'}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {filteredTransactions.length === 0 && (
              <div className="p-12 text-center border-2 border-dashed border-border rounded-2xl">
                <CircleDollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <h3 className="font-semibold text-muted-foreground">Aucune transaction trouvée</h3>
                <p className="text-sm text-muted-foreground">
                  Vos futurs paiements apparaîtront ici.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
