"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Loader2, FileText } from "lucide-react"

const MODE_LABEL: Record<string, string> = { SEA_FCL: "Maritime FCL", SEA_LCL: "Maritime LCL", AIR: "Aérien", LAND: "Routier" }

export function QuoteSummary({ requestId }: { requestId: string }) {
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState<any>(null)

  useEffect(() => {
    ;(async () => {
      const supabase = createClient()
      const { data } = await supabase.from("request_quotes").select("*").eq("request_id", requestId).order("created_at", { ascending: false }).limit(1).maybeSingle()
      setQ(data); setLoading(false)
    })()
  }, [requestId])

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
  if (!q) return <p className="text-sm text-muted-foreground">Aucune cotation soumise par le partenaire.</p>

  const fmt = (n: any) => "$" + (Number(n) || 0).toLocaleString()
  const line = (l: string, v: any) => (
    <div className="flex justify-between py-1 text-sm"><span className="text-muted-foreground">{l}</span><span className="font-medium">{v ?? "—"}</span></div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2"><FileText className="w-4 h-4" /> Cotation partenaire</h3>
        <Badge variant={q.status === "APPROVED" ? "default" : q.status === "SUBMITTED" ? "secondary" : "outline"}>
          {q.status === "APPROVED" ? "Validée" : q.status === "SUBMITTED" ? "Soumise" : "Brouillon"}
        </Badge>
      </div>
      <div className="grid sm:grid-cols-2 gap-x-6">
        {line("Mode", MODE_LABEL[q.transport_mode] || q.transport_mode)}
        {line("Incoterm", q.incoterm)}
        {line("Expéditeur", q.carrier)}
        {line("Poids brut", q.gross_weight_kg ? q.gross_weight_kg + " kg" : "—")}
        {line("Volume", q.volume_cbm ? q.volume_cbm + " CBM" : "—")}
        {line("Colis", q.packages)}
        {line("ETD", q.etd)}
        {line("ETA", q.eta)}
        {line("Validité", q.validity_date)}
      </div>
      <div className="border-t pt-2">
        {line("Marchandise", fmt(q.goods_cost))}
        {line("Fret", fmt(q.freight_cost))}
        {line("Assurance", fmt(q.insurance_cost))}
        {line("Frais locaux", fmt(q.local_fees))}
      </div>
      <div className="flex justify-between items-center p-3 rounded-lg bg-primary/5 border border-primary/20">
        <span className="text-sm font-medium">Total cotation</span>
        <span className="text-xl font-bold">{fmt(q.total_amount)}</span>
      </div>
      {q.notes && <p className="text-xs text-muted-foreground italic">{q.notes}</p>}
    </div>
  )
}
