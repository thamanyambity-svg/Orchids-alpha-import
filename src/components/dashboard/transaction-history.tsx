"use client"

import { Clock, CheckCircle2, MoreHorizontal } from "lucide-react"

export function TransactionHistory() {
  const transactions = [
    { date: "23.02.2024", label: "Perenpc Parmsvmt", sublabel: "Anern Gcnnm and fontrest", amount: "13,500 $", status: "Confirmé" },
    { date: "25.04.2024", label: "Paremsv: Dopetit", sublabel: "Anern Gcnnm and fontrest", amount: "A venir", status: "A venir" },
    { date: "25.06.2024", label: "Patence: Depecit:", sublabel: "", amount: "A venir", status: "A venir" },
  ]

  return (
    <div className="glass rounded-3xl overflow-hidden mt-6">
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h3 className="text-sm font-bold tracking-widest uppercase">HISTORIQUE DES TRANSACTIONS</h3>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Clock className="w-4 h-4" />
            </button>
            <button className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <MoreHorizontal className="w-5 h-5 text-muted-foreground cursor-pointer" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest border-b border-white/5">
              <th className="px-6 py-4 font-normal">Date</th>
              <th className="px-6 py-4 font-normal">Montant</th>
              <th className="px-6 py-4 font-normal text-right">Statuis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {transactions.map((tx, idx) => (
              <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-muted-foreground">{tx.date}</span>
                    <div>
                      <p className="text-xs font-bold text-white uppercase tracking-tight">{tx.label}</p>
                      {tx.sublabel && <p className="text-[10px] text-muted-foreground">{tx.sublabel}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-sm font-bold ${tx.amount === "A venir" ? "text-muted-foreground" : "text-primary"}`}>
                    {tx.amount}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                    tx.status === "Confirmé" 
                      ? "bg-primary/20 text-primary border border-primary/30" 
                      : "bg-secondary/50 text-muted-foreground border border-white/5"
                  }`}>
                    {tx.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
