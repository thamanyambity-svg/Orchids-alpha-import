"use client"

import { Clock, CheckCircle2, MoreHorizontal, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export function TransactionHistory({ requestId }: { requestId?: string }) {
  const [payments, setPayments] = useState<{ created_at: string; type: string; amount: number; currency: string; status: string }[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!requestId) return

    async function fetchPayments() {
      setLoading(true)
      try {
        // Fetch orders first to get payments
        const { data: orders } = await supabase
          .from('orders')
          .select('id')
          .eq('request_id', requestId)
        
        if (orders && orders.length > 0) {
          const orderIds = orders.map(o => o.id)
          const { data } = await supabase
            .from('payments')
            .select('*')
            .in('order_id', orderIds)
            .order('created_at', { ascending: false })
          
          if (data) setPayments(data)
        }
      } catch (error) {
        console.error('Error fetching payments:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPayments()
  }, [requestId])

  if (!requestId) {
    return (
      <div className="glass rounded-3xl overflow-hidden mt-6 p-10 text-center">
        <p className="text-muted-foreground uppercase text-xs tracking-widest">Aucune transaction disponible</p>
      </div>
    )
  }

  return (
    <div className="glass rounded-3xl overflow-hidden mt-6">
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h3 className="text-sm font-bold tracking-widest uppercase">HISTORIQUE DES TRANSACTIONS</h3>
          <div className="flex items-center gap-2">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <>
                <button className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                  <Clock className="w-4 h-4" />
                </button>
                <button className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground transition-colors">
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
        <MoreHorizontal className="w-5 h-5 text-muted-foreground cursor-pointer" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest border-b border-white/5">
              <th className="px-6 py-4 font-normal">Date</th>
              <th className="px-6 py-4 font-normal">Type</th>
              <th className="px-6 py-4 font-normal">Montant</th>
              <th className="px-6 py-4 font-normal text-right">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {payments.length === 0 && !loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground text-xs uppercase">Aucune transaction trouvée</td>
              </tr>
            ) : (
              payments.map((tx, idx) => (
                <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-white uppercase tracking-tight">{tx.type.replace('_', ' ')}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-primary">
                      {tx.amount} {tx.currency}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                      tx.status === "PAID" || tx.status === "BLOCKED"
                        ? "bg-primary/20 text-primary border border-primary/30" 
                        : "bg-secondary/50 text-muted-foreground border border-white/5"
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
