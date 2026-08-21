"use client"

import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n-context"
import { ChevronLeft, ChevronRight, Eye, Filter, Loader2, ScrollText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

type AccessLog = {
  id: string
  document_type: "REQUEST_DOCUMENT" | "PAYMENT_PROOF"
  document_id: string
  action: "VIEW" | "DOWNLOAD" | "SIGNED_URL_GENERATED"
  created_at: string
  accessed_at: string
  ip_address: string | null
  user_agent: string | null
  metadata: Record<string, unknown> | null
  actor_email: string | null
  actor_full_name: string | null
}

const PAGE_SIZE = 25

const documentTypeLabel: Record<AccessLog["document_type"], string> = {
  REQUEST_DOCUMENT: "Document de demande",
  PAYMENT_PROOF: "Justificatif de paiement",
}

const actionBadge: Record<AccessLog["action"], { label: string; className: string }> = {
  VIEW: { label: "Consultation", className: "bg-primary/10 text-primary" },
  DOWNLOAD: { label: "Téléchargement", className: "bg-chart-3/10 text-chart-3" },
  SIGNED_URL_GENERATED: { label: "Lien signé généré", className: "bg-[#ffd700]/10 text-[#ffd700]" },
}

export default function AdminAuditLogsPage() {
  const { t } = useLanguage()
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [documentType, setDocumentType] = useState("all")
  const [action, setAction] = useState("all")
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
      if (documentType !== "all") params.set("document_type", documentType)
      if (action !== "all") params.set("action", action)

      const res = await fetch(`/api/admin/document-access-logs?${params}`)
      if (!res.ok) throw new Error("fetch failed")

      const body = await res.json()
      setLogs(body.logs ?? [])
      setTotal(body.total ?? 0)
    } catch {
      toast.error(t("admin.audit.load_error", "Impossible de charger le journal"))
    } finally {
      setLoading(false)
    }
  }, [page, documentType, action, t])

  useEffect(() => {
    load()
  }, [load])

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">
          {t("admin.audit.title", "Accès aux documents")}
        </h1>
        <p className="text-white/40 text-sm">
          {t(
            "admin.audit.subtitle",
            "Qui a ouvert quelle pièce sensible, et quand. Ce journal ne peut être ni modifié ni effacé, y compris par un administrateur."
          )}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Select
          value={documentType}
          onValueChange={(value) => {
            setDocumentType(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[240px] bg-white/5 border-white/10 text-white">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.audit.all_types", "Tous les documents")}</SelectItem>
            <SelectItem value="PAYMENT_PROOF">{documentTypeLabel.PAYMENT_PROOF}</SelectItem>
            <SelectItem value="REQUEST_DOCUMENT">{documentTypeLabel.REQUEST_DOCUMENT}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={action}
          onValueChange={(value) => {
            setAction(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[220px] bg-white/5 border-white/10 text-white">
            <Eye className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.audit.all_actions", "Toutes les actions")}</SelectItem>
            <SelectItem value="SIGNED_URL_GENERATED">{actionBadge.SIGNED_URL_GENERATED.label}</SelectItem>
            <SelectItem value="VIEW">{actionBadge.VIEW.label}</SelectItem>
            <SelectItem value="DOWNLOAD">{actionBadge.DOWNLOAD.label}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#ffd700]" />
        </div>
      ) : logs.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-white/10 rounded-2xl">
          <ScrollText className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="font-semibold text-white/50">{t("admin.audit.empty", "Aucun accès enregistré")}</h3>
          <p className="text-sm text-white/30">
            {t("admin.audit.empty_hint", "Une entrée est écrite dès qu'une pièce sensible est ouverte.")}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {logs.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={actionBadge[log.action].className}>{actionBadge[log.action].label}</Badge>
                  <span className="text-sm text-white/70">{documentTypeLabel[log.document_type]}</span>
                  <span className="font-mono text-xs text-white/35">{log.document_id.slice(0, 8)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-white/40">
                  <span>{log.actor_full_name || log.actor_email || "—"}</span>
                  {log.ip_address && <span className="font-mono">{log.ip_address}</span>}
                  <span>
                    {new Date(log.accessed_at ?? log.created_at).toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <span className="text-xs text-white/35">
              {t("admin.audit.count", "{total} entrée(s)").replace("{total}", String(total))}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 text-white/70"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-white/50">
                {page} / {lastPage}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 text-white/70"
                disabled={page >= lastPage}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
