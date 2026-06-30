"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, ArrowLeft, Wallet, Coins, PackageCheck, Clock, Gauge, FileClock, MapPin, Star } from "lucide-react"

const fmt = (n: number) => "$" + (Number(n) || 0).toLocaleString()
const daysBetween = (a: string, b: string) =>
  Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000))

// Buckets par statut d'order (cf. machine à états)
const IN_PROGRESS = ["FUNDED", "SOURCING", "PURCHASED", "SHIPPED", "EXECUTING"]
const DONE = ["DELIVERED", "CLOSED"]
const WAITING = ["PENDING", "AWAITING_DEPOSIT", "AWAITING_BALANCE"]
const FROZEN = ["FROZEN", "INCIDENT", "CANCELLED"]

const statusLabel: Record<string, string> = {
  PENDING: "En attente", AWAITING_DEPOSIT: "Attente acompte", AWAITING_BALANCE: "Attente solde",
  FUNDED: "Financé", SOURCING: "Sourcing", PURCHASED: "Acheté", SHIPPED: "Expédié",
  EXECUTING: "En exécution", DELIVERED: "Livré", CLOSED: "Clôturé", FROZEN: "Gelé",
  INCIDENT: "Incident", CANCELLED: "Annulé",
}

export default function PartnerDetailPage() {
  const params = useParams()
  const partnerId = params?.id as string
  const [loading, setLoading] = useState(true)
  const [partner, setPartner] = useState<any>(null)
  const [rows, setRows] = useState<any[]>([])
  const [incidents, setIncidents] = useState(0)

  useEffect(() => {
    if (!partnerId) return
    const supabase = createClient()
    ;(async () => {
      const { data: pp } = await supabase
        .from("partner_profiles")
        .select(`*, user:profiles!partner_profiles_user_id_fkey ( full_name, company_name, email, phone ), country:countries ( name, code )`)
        .eq("id", partnerId)
        .maybeSingle()
      setPartner(pp)

      const { data: reqs } = await supabase
        .from("import_requests")
        .select(`id, reference, product_name, category, status, budget_max, created_at,
          buyer:profiles!import_requests_buyer_id_fkey ( full_name, company_name ),
          orders ( id, reference, status, total_amount, alpha_commission, deposit_amount, balance_amount, deposit_paid, balance_paid, created_at, updated_at )`)
        .eq("assigned_partner_id", partnerId)
        .order("created_at", { ascending: false })

      const flat = (reqs || []).map((r: any) => {
        const o = r.orders?.[0] || null
        return {
          reqId: r.id, reference: r.reference, product: r.product_name || r.category,
          buyer: r.buyer?.company_name || r.buyer?.full_name || "—",
          reqStatus: r.status, reqCreated: r.created_at, budget: r.budget_max,
          order: o,
          status: o?.status || r.status,
          amount: o?.total_amount ?? r.budget_max ?? 0,
          commission: o?.alpha_commission ?? 0,
          deposit_paid: !!o?.deposit_paid, balance_paid: !!o?.balance_paid,
          delay: o && DONE.includes(o.status) ? daysBetween(r.created_at, o.updated_at) : null,
        }
      })
      setRows(flat)

      const orderIds = flat.map(f => f.order?.id).filter(Boolean)
      if (orderIds.length) {
        const { count } = await supabase.from("incidents").select("*", { count: "exact", head: true }).in("order_id", orderIds)
        setIncidents(count || 0)
      }
      setLoading(false)
    })()
  }, [partnerId])

  if (loading) return <div className="flex items-center justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-[#ffd700]" /></div>
  if (!partner) return <div className="p-8 text-white/70">Partenaire introuvable. <Link href="/admin/partners" className="text-[#ffd700] underline">Retour</Link></div>

  const inProgress = rows.filter(r => IN_PROGRESS.includes(r.status))
  const done = rows.filter(r => DONE.includes(r.status))
  const waiting = rows.filter(r => WAITING.includes(r.status) || (!r.order && !DONE.includes(r.status)))
  const frozen = rows.filter(r => FROZEN.includes(r.status))

  const ordersWithO = rows.filter(r => r.order)
  const volume = ordersWithO.reduce((a, r) => a + Number(r.amount || 0), 0)
  const commission = ordersWithO.filter(r => r.deposit_paid).reduce((a, r) => a + Number(r.commission || 0), 0)
  const delays = done.map(r => r.delay).filter((d): d is number => d != null)
  const avgDelay = delays.length ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : null
  const awaitingQuote = rows.filter(r => ["PENDING", "ANALYSIS"].includes(r.reqStatus)).length
  const execRate = ordersWithO.length ? Math.round((done.length / ordersWithO.length) * 100) : 0

  const kpi = [
    { icon: Wallet, label: "Volume total", value: fmt(volume), color: "text-[#ffd700]" },
    { icon: Coins, label: "Commission générée", value: fmt(commission), color: "text-emerald-400" },
    { icon: PackageCheck, label: "Commandes", value: String(ordersWithO.length), color: "text-blue-400" },
    { icon: Clock, label: "Délai moyen traitement", value: avgDelay != null ? `${avgDelay} j` : "—", color: "text-orange-400" },
    { icon: Gauge, label: "Taux d'exécution", value: `${execRate}%`, color: "text-purple-400" },
    { icon: FileClock, label: "En attente de cotation", value: String(awaitingQuote), color: "text-amber-400" },
  ]

  const Table = ({ data, showDelay = false }: { data: any[]; showDelay?: boolean }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-white/40 text-xs uppercase border-b border-white/10">
            <th className="py-2 pr-3">Référence</th><th className="pr-3">Produit</th><th className="pr-3">Client</th>
            <th className="pr-3">Montant</th><th className="pr-3">60%</th><th className="pr-3">40%</th>
            <th className="pr-3">Statut</th>{showDelay && <th className="pr-3">Délai</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={i} className="border-b border-white/5 text-white/80">
              <td className="py-2 pr-3 font-mono text-xs">{r.order?.reference || r.reference}</td>
              <td className="pr-3">{r.product}</td>
              <td className="pr-3">{r.buyer}</td>
              <td className="pr-3 font-semibold">{fmt(r.amount)}</td>
              <td className="pr-3">{r.deposit_paid ? <span className="text-emerald-400">✓</span> : <span className="text-white/30">—</span>}</td>
              <td className="pr-3">{r.balance_paid ? <span className="text-emerald-400">✓</span> : <span className="text-white/30">—</span>}</td>
              <td className="pr-3"><Badge variant="outline" className="text-[10px]">{statusLabel[r.status] || r.status}</Badge></td>
              {showDelay && <td className="pr-3">{r.delay != null ? `${r.delay} j` : "—"}</td>}
            </tr>
          ))}
          {data.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-white/30">Aucune commande</td></tr>}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="p-6 space-y-6 text-white">
      <Link href="/admin/partners" className="inline-flex items-center gap-2 text-white/50 hover:text-white text-sm">
        <ArrowLeft className="w-4 h-4" /> Réseau Logistique
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{partner.user?.company_name || partner.user?.full_name || "Partenaire"}</h1>
          <div className="flex items-center gap-3 text-sm text-white/50 mt-1">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{partner.country?.name} ({partner.country?.code})</span>
            <span>{partner.user?.email}</span>
            <span>{partner.user?.phone}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-white/10">{partner.contract_status}</Badge>
          <span className="flex items-center gap-1 text-[#ffd700] font-bold"><Star className="w-4 h-4" />{partner.performance_score}</span>
          {incidents > 0 && <Badge variant="destructive">{incidents} incident(s)</Badge>}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpi.map((k, i) => (
          <Card key={i} className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <k.icon className={`w-5 h-5 mb-2 ${k.color}`} />
              <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-[11px] text-white/50 mt-1">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Orders */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader><CardTitle className="text-base">Commandes</CardTitle></CardHeader>
        <CardContent>
          <Tabs defaultValue="progress">
            <TabsList className="bg-white/5">
              <TabsTrigger value="progress">En cours ({inProgress.length})</TabsTrigger>
              <TabsTrigger value="done">Exécutées ({done.length})</TabsTrigger>
              <TabsTrigger value="waiting">En attente ({waiting.length})</TabsTrigger>
              {frozen.length > 0 && <TabsTrigger value="frozen">Gelées ({frozen.length})</TabsTrigger>}
            </TabsList>
            <TabsContent value="progress" className="mt-4"><Table data={inProgress} /></TabsContent>
            <TabsContent value="done" className="mt-4"><Table data={done} showDelay /></TabsContent>
            <TabsContent value="waiting" className="mt-4"><Table data={waiting} /></TabsContent>
            <TabsContent value="frozen" className="mt-4"><Table data={frozen} /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
