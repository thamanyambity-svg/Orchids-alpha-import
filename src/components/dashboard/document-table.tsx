"use client"

import { FileText, MoreHorizontal } from "lucide-react"

export function DocumentTable() {
  const documents = [
    { id: "#542300", type: "Electronique", amount: "12,500 $", status: "Confirmé", date: "Confirmine" },
    { id: "#563298", type: "Electronique", amount: "8,100 $", status: "A venir", date: "A venir" },
    { id: "#542266", type: "Electronique", amount: "25,200 $", status: "A venir", date: "A venir" },
    { id: "#542274", type: "Electronique", amount: "9,200 $", status: "A venir", date: "A venir" },
  ]

  return (
    <div className="glass rounded-3xl overflow-hidden">
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-widest uppercase">DOCUMENTS DES TRANSACTIONS</h3>
        <MoreHorizontal className="w-5 h-5 text-muted-foreground cursor-pointer" />
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest border-b border-white/5">
              <th className="px-6 py-4 font-normal">Resoce</th>
              <th className="px-6 py-4 font-normal">Botines</th>
              <th className="px-6 py-4 font-normal">Statur</th>
              <th className="px-6 py-4 font-normal text-right">Eatur</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {documents.map((doc, idx) => (
              <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-white">{doc.id}</span>
                    <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-muted-foreground border border-white/10 uppercase">
                      2 Enteerré
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-primary">{doc.amount}</td>
                <td className="px-6 py-4 text-xs text-muted-foreground">Pacoment icenide!</td>
                <td className="px-6 py-4 text-right">
                  <span className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                    doc.status === "Confirmé" 
                      ? "bg-primary/20 text-primary border border-primary/30" 
                      : "bg-secondary/50 text-muted-foreground border border-white/5"
                  }`}>
                    {doc.date}
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
