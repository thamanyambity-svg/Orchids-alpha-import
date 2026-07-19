"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n-context"
import {
  FileText,
  Search,
  Loader2,
  Download,
  Calendar,
  Building2,
  User,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"

const statusBadge: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-primary/10 text-primary",
  PAID: "bg-success/10 text-success",
  OVERDUE: "bg-destructive/10 text-destructive",
  CANCELLED: "bg-muted text-muted-foreground",
}

const typeLabel: Record<string, string> = {
  PROFORMA: "Proforma",
  COMMERCIAL: "Commerciale",
  FINAL: "Finale",
}

export default function AdminInvoicesPage() {
  const { t } = useLanguage()
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    async function fetchInvoices() {
      const supabase = createClient()
      const { data } = await supabase
        .from("invoices")
        .select(`*, import_requests(reference, product_name)`)
        .order("created_at", { ascending: false })

      if (data) setInvoices(data)
      setLoading(false)
    }
    fetchInvoices()
  }, [])

  const filtered = invoices.filter(inv => {
    const matchSearch = inv.number?.toLowerCase().includes(search.toLowerCase()) ||
      inv.import_requests?.reference?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || inv.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">{t("admin.invoices.title", "Factures")}</h1>
        <p className="text-white/40 text-sm">{t("admin.invoices.subtitle", "Gérez l'ensemble des factures proforma, commerciales et finales")}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            placeholder={t("admin.invoices.search", "Rechercher...")}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.invoices.all", "Toutes")}</SelectItem>
            <SelectItem value="DRAFT">{t("admin.invoices.draft", "Brouillon")}</SelectItem>
            <SelectItem value="SENT">{t("admin.invoices.sent", "Envoyée")}</SelectItem>
            <SelectItem value="PAID">{t("admin.invoices.paid", "Payée")}</SelectItem>
            <SelectItem value="OVERDUE">{t("admin.invoices.overdue", "En retard")}</SelectItem>
            <SelectItem value="CANCELLED">{t("admin.invoices.cancelled", "Annulée")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#ffd700]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-white/10 rounded-2xl">
          <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="font-semibold text-white/50">{t("admin.invoices.empty", "Aucune facture")}</h3>
          <p className="text-sm text-white/30">{t("admin.invoices.empty_hint", "Générez des factures depuis les commandes validées.")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inv, i) => (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/[0.07] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#ffd700]/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-[#ffd700]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">{inv.number}</span>
                      <Badge className={statusBadge[inv.status]}>
                        {inv.status === "DRAFT" ? "Brouillon" : inv.status === "SENT" ? "Envoyée" : inv.status === "PAID" ? "Payée" : inv.status === "OVERDUE" ? "En retard" : "Annulée"}
                      </Badge>
                      <Badge variant="outline" className="border-white/20 text-white/60">
                        {typeLabel[inv.type] || inv.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/40">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(inv.issued_at).toLocaleDateString("fr-FR")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {inv.import_requests?.reference || "—"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-white">${inv.total_amount?.toLocaleString()}</span>
                  {inv.file_url && (
                    <a href={inv.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="border-white/10 text-white/70 hover:text-white">
                        <Download className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
