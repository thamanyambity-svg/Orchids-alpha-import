import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  getDocumentAccessLogs,
  getAuditLogStats,
} from "@/app/actions/audit-logs"
import { AuditLogsClient } from "@/components/admin/audit-logs/audit-logs-client"
import { ScrollText } from "lucide-react"

export const dynamic = "force-dynamic"

type Props = { searchParams: Promise<{ page?: string }> }

export default async function AdminAuditLogsPage({ searchParams }: Props) {
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
  const pageSize = 15

  const [logs, stats] = await Promise.all([
    getDocumentAccessLogs({ page, pageSize }),
    getAuditLogStats(),
  ])

  if (!logs.success) {
    return (
      <div className="p-8 text-red-400 text-sm font-mono">{logs.error}</div>
    )
  }

  const s = stats.success ? stats.data : null

  return (
    <div className="p-8 space-y-8 max-w-6xl">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-[#ffd700]/10 border border-[#ffd700]/20">
          <ScrollText className="w-8 h-8 text-[#ffd700]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Audit documents</h1>
          <p className="text-sm text-white/50">
            Accès traçables aux documents sensibles (URL signées, etc.)
          </p>
        </div>
      </div>

      {s && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs text-white/40 uppercase tracking-wider">24h — Total</p>
            <p className="text-2xl font-mono text-white mt-1">{s.total24h}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs text-white/40 uppercase tracking-wider">
              URL signées générées
            </p>
            <p className="text-2xl font-mono text-[#ffd700] mt-1">{s.signedUrls24h}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs text-white/40 uppercase tracking-wider">
              Admins actifs
            </p>
            <p className="text-2xl font-mono text-white mt-1">{s.uniqueAdmins24h}</p>
          </div>
        </div>
      )}

      <AuditLogsClient
        initialRows={logs.data.rows}
        initialTotal={logs.data.total}
        pageSize={pageSize}
        initialPage={page}
      />
    </div>
  )
}
