"use client"

import { useCallback, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  getDocumentAccessLogs,
  type DocumentAccessLogRow,
} from "@/app/actions/audit-logs"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Loader2, Lock } from "lucide-react"

type Props = {
  initialRows: DocumentAccessLogRow[]
  initialTotal: number
  pageSize: number
  initialPage: number
}

export function AuditLogsClient({
  initialRows,
  initialTotal,
  pageSize,
  initialPage,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [rows, setRows] = useState(initialRows)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(initialPage)
  const [docType, setDocType] = useState("")
  const [action, setAction] = useState("")
  const [email, setEmail] = useState("")

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const load = useCallback(
    (p: number) => {
      startTransition(async () => {
        const res = await getDocumentAccessLogs({
          page: p,
          pageSize,
          documentType: docType.trim() || undefined,
          action: action.trim() || undefined,
          emailSearch: email.trim() || undefined,
        })
        if (!res.success) {
          console.error(res.error)
          return
        }
        setRows(res.data.rows)
        setTotal(res.data.total)
        setPage(p)
      })
    },
    [pageSize, docType, action, email]
  )

  function applyFilters() {
    load(1)
  }

  function goPage(p: number) {
    const next = Math.min(Math.max(1, p), totalPages)
    load(next)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
        <Lock className="w-5 h-5 text-amber-400 shrink-0" />
        <p className="text-sm text-amber-200/90 flex-1 min-w-[200px]">
          Journal <strong>lecture seule</strong> — accès sensibles (ex. URL signées). Aucune
          modification possible.
        </p>
        <Badge variant="outline" className="border-amber-500/40 text-amber-200">
          Immutable
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-white/60 text-xs">Type document</Label>
          <Input
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            placeholder="payment_proof"
            className="bg-white/5 border-white/10 text-white text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-white/60 text-xs">Action</Label>
          <Input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="SIGNED_URL_GENERATED"
            className="bg-white/5 border-white/10 text-white text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-white/60 text-xs">Admin (email / nom)</Label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white/5 border-white/10 text-white text-sm"
          />
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            onClick={applyFilters}
            disabled={isPending}
            className="bg-white/10 text-white hover:bg-white/20"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Filtrer"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-white/10 text-left text-[#ffd700]/80 text-xs uppercase">
              <th className="p-3">Horodatage</th>
              <th className="p-3">Administrateur</th>
              <th className="p-3">Action</th>
              <th className="p-3">Type</th>
              <th className="p-3">Document</th>
              <th className="p-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-white/5 text-white/70">
                <td className="p-3 font-mono text-xs whitespace-nowrap">
                  {format(new Date(r.created_at), "dd/MM/yy HH:mm:ss", { locale: fr })}
                </td>
                <td className="p-3 text-xs">
                  <div>{r.accessor_email ?? r.admin_id.slice(0, 8)}</div>
                  {r.accessor_name && (
                    <div className="text-white/40">{r.accessor_name}</div>
                  )}
                </td>
                <td className="p-3">
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {r.action}
                  </Badge>
                </td>
                <td className="p-3 text-xs">{r.document_type}</td>
                <td className="p-3 font-mono text-xs" title={r.document_id}>
                  {r.document_id.slice(0, 8)}…
                </td>
                <td className="p-3 font-mono text-xs text-white/50">
                  {r.ip_address ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-8 text-center text-white/40 text-sm">Aucune entrée.</p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={page <= 1 || isPending}
            onClick={() => goPage(page - 1)}
            className="text-white/70"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs font-mono text-white/50">
            {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={page >= totalPages || isPending}
            onClick={() => goPage(page + 1)}
            className="text-white/70"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
