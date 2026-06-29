"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Send, Save, FileText } from "lucide-react"

const CARRIERS = ["Maersk", "MSC", "CMA CGM", "Hapag-Lloyd", "COSCO", "Bolloré / AGL", "DHL", "Kuehne+Nagel", "Emirates SkyCargo", "Autre"]
const MODES = [["SEA_FCL", "Maritime FCL (conteneur complet)"], ["SEA_LCL", "Maritime LCL (groupage)"], ["AIR", "Aérien"], ["LAND", "Routier"]]
const INCOTERMS = ["FOB", "CIF", "EXW", "DDP", "DAP", "CFR"]

type Quote = Record<string, any>

export function QuoteForm({ requestId, status }: { requestId: string; status: string }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [quote, setQuote] = useState<Quote>({
    transport_mode: "SEA_FCL", incoterm: "FOB", carrier: "Maersk",
    goods_cost: "", freight_cost: "", insurance_cost: "", local_fees: "",
    gross_weight_kg: "", volume_cbm: "", packages: "", dimensions: "",
    etd: "", eta: "", validity_date: "", notes: "", status: "DRAFT",
  })
  const [quoteId, setQuoteId] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from("request_quotes").select("*").eq("request_id", requestId).order("created_at", { ascending: false }).limit(1).maybeSingle()
      if (data) { setQuote({ ...data, goods_cost: data.goods_cost ?? "", freight_cost: data.freight_cost ?? "", insurance_cost: data.insurance_cost ?? "", local_fees: data.local_fees ?? "" }); setQuoteId(data.id) }
      setLoading(false)
    })()
  }, [requestId])

  const num = (v: any) => Number(v) || 0
  const total = num(quote.goods_cost) + num(quote.freight_cost) + num(quote.insurance_cost) + num(quote.local_fees)
  const locked = quote.status === "APPROVED"
  const set = (k: string, v: any) => setQuote((q) => ({ ...q, [k]: v }))

  async function save(submit: boolean) {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const payload: Quote = {
        request_id: requestId, submitted_by: user?.id,
        status: submit ? "SUBMITTED" : "DRAFT",
        gross_weight_kg: num(quote.gross_weight_kg) || null, volume_cbm: num(quote.volume_cbm) || null,
        packages: parseInt(quote.packages) || null, dimensions: quote.dimensions || null,
        transport_mode: quote.transport_mode, incoterm: quote.incoterm, carrier: quote.carrier,
        etd: quote.etd || null, eta: quote.eta || null, validity_date: quote.validity_date || null,
        goods_cost: num(quote.goods_cost), freight_cost: num(quote.freight_cost),
        insurance_cost: num(quote.insurance_cost), local_fees: num(quote.local_fees),
        total_amount: total, notes: quote.notes || null,
      }
      let res
      if (quoteId) res = await supabase.from("request_quotes").update(payload).eq("id", quoteId).select().single()
      else res = await supabase.from("request_quotes").insert(payload).select().single()
      if (res.error) throw res.error
      setQuote({ ...res.data, goods_cost: res.data.goods_cost ?? "", freight_cost: res.data.freight_cost ?? "", insurance_cost: res.data.insurance_cost ?? "", local_fees: res.data.local_fees ?? "" })
      setQuoteId(res.data.id)
      toast.success(submit ? "Cotation soumise à l'administration" : "Brouillon enregistré")
    } catch (e: any) { toast.error(e.message || "Erreur") } finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>

  const fld = "space-y-1.5"
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2"><FileText className="w-4 h-4" /> Cotation</h3>
        <Badge variant={quote.status === "APPROVED" ? "default" : quote.status === "SUBMITTED" ? "secondary" : "outline"}>
          {quote.status === "APPROVED" ? "Validée par l'admin" : quote.status === "SUBMITTED" ? "Soumise — en attente admin" : "Brouillon"}
        </Badge>
      </div>

      {/* Cargo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={fld}><Label>Poids brut (kg)</Label><Input type="number" disabled={locked} value={quote.gross_weight_kg} onChange={e => set("gross_weight_kg", e.target.value)} /></div>
        <div className={fld}><Label>Volume (CBM)</Label><Input type="number" disabled={locked} value={quote.volume_cbm} onChange={e => set("volume_cbm", e.target.value)} /></div>
        <div className={fld}><Label>Colis</Label><Input type="number" disabled={locked} value={quote.packages} onChange={e => set("packages", e.target.value)} /></div>
        <div className={fld}><Label>Dimensions</Label><Input disabled={locked} value={quote.dimensions} onChange={e => set("dimensions", e.target.value)} placeholder="L×l×h" /></div>
      </div>

      {/* Expédition */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className={fld}><Label>Mode de transport</Label>
          <Select value={quote.transport_mode} onValueChange={v => set("transport_mode", v)} disabled={locked}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{MODES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className={fld}><Label>Incoterm</Label>
          <Select value={quote.incoterm} onValueChange={v => set("incoterm", v)} disabled={locked}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{INCOTERMS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className={fld}><Label>Expéditeur / transitaire</Label>
          <Select value={CARRIERS.includes(quote.carrier) ? quote.carrier : "Autre"} onValueChange={v => set("carrier", v === "Autre" ? "" : v)} disabled={locked}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CARRIERS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
          </Select>
          {(!CARRIERS.includes(quote.carrier) || quote.carrier === "") && <Input className="mt-2" disabled={locked} value={quote.carrier} onChange={e => set("carrier", e.target.value)} placeholder="Nom du transitaire" />}
        </div>
        <div className={fld}><Label>ETD (départ)</Label><Input type="date" disabled={locked} value={quote.etd || ""} onChange={e => set("etd", e.target.value)} /></div>
        <div className={fld}><Label>ETA (arrivée)</Label><Input type="date" disabled={locked} value={quote.eta || ""} onChange={e => set("eta", e.target.value)} /></div>
        <div className={fld}><Label>Validité du devis</Label><Input type="date" disabled={locked} value={quote.validity_date || ""} onChange={e => set("validity_date", e.target.value)} /></div>
      </div>

      {/* Prix */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={fld}><Label>Marchandise ($)</Label><Input type="number" disabled={locked} value={quote.goods_cost} onChange={e => set("goods_cost", e.target.value)} /></div>
        <div className={fld}><Label>Fret ($)</Label><Input type="number" disabled={locked} value={quote.freight_cost} onChange={e => set("freight_cost", e.target.value)} /></div>
        <div className={fld}><Label>Assurance ($)</Label><Input type="number" disabled={locked} value={quote.insurance_cost} onChange={e => set("insurance_cost", e.target.value)} /></div>
        <div className={fld}><Label>Frais locaux ($)</Label><Input type="number" disabled={locked} value={quote.local_fees} onChange={e => set("local_fees", e.target.value)} /></div>
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
        <span className="text-sm font-medium">Total cotation</span>
        <span className="text-2xl font-bold">${total.toLocaleString()}</span>
      </div>

      <div className={fld}><Label>Notes</Label><Textarea disabled={locked} value={quote.notes || ""} onChange={e => set("notes", e.target.value)} placeholder="Conditions, délais, remarques…" /></div>

      {!locked && (
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => save(false)} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Enregistrer le brouillon
          </Button>
          <Button onClick={() => save(true)} disabled={saving || total <= 0}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />} Soumettre à l'administration
          </Button>
        </div>
      )}
      {locked && <p className="text-xs text-muted-foreground">Cotation validée — modification verrouillée.</p>}
    </div>
  )
}
