import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  getExchangeRateHistory,
  getActiveExchangeRate,
} from "@/app/actions/exchange-rates"
import { RateFormClient } from "@/components/admin/exchange-rates/rate-form-client"
import { RateHistoryClient } from "@/components/admin/exchange-rates/rate-history-client"
import { TrendingUp } from "lucide-react"

export const dynamic = "force-dynamic"

type Props = { searchParams: Promise<{ page?: string }> }

export default async function AdminExchangeRatesPage({ searchParams }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  if (profile?.role !== "ADMIN") redirect("/dashboard")

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1)
  const pageSize = 20

  const [hist, activeEur] = await Promise.all([
    getExchangeRateHistory({ page, pageSize }),
    getActiveExchangeRate("EUR"),
  ])

  if (!hist.success) {
    return (
      <div className="p-8 text-red-400 font-mono text-sm">
        {hist.error}
      </div>
    )
  }

  const active = activeEur.success ? activeEur.data : null

  return (
    <div className="p-8 space-y-10 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-[#ffd700]/10 border border-[#ffd700]/20">
          <TrendingUp className="w-8 h-8 text-[#ffd700]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Taux de change
          </h1>
          <p className="text-sm text-white/50">
            Base USD — historique en lecture seule, aucune valeur codée en dur.
          </p>
        </div>
      </div>

      {active && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-1">
            Dernier taux USD → EUR (exemple)
          </p>
          <p className="text-2xl font-mono text-[#ffd700]">
            1 USD = {Number(active.rate).toLocaleString("fr-FR")} EUR
          </p>
        </div>
      )}

      <div className="space-y-10">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Nouveau taux
          </h2>
          <RateFormClient />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Historique
          </h2>
          <RateHistoryClient
            initialRows={hist.data.rows}
            initialTotal={hist.data.total}
            pageSize={pageSize}
            initialPage={page}
          />
        </div>
      </div>
    </div>
  )
}
