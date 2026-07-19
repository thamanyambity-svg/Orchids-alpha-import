"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n-context"
import {
  FileText,
  Search,
  Loader2,
  Download,
  ExternalLink,
  Calendar,
  Building2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DashboardHeader } from "@/components/dashboard/header"
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

export default function DashboardInvoicesPage() {
  const { t } = useLanguage()
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function fetchInvoices() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from("invoices")
        .select(`*, import_requests!inner(reference, product_name)`)
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false })

      if (data) setInvoices(data)
      setLoading(false)
    }
    fetchInvoices()
  }, [])

  const filtered = invoices.filter(inv =>
    inv.number?.toLowerCase().includes(search.toLowerCase()) ||
    inv.import_requests?.reference?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <DashboardHeader
        title={t("dashboard.invoices.title", "Factures")}
        subtitle={t("dashboard.invoices.subtitle", "Consultez et téléchargez vos factures proforma, commerciales et finales")}
      />

      <div className="p-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("dashboard.invoices.search", "Rechercher par numéro ou référence...")}
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-border rounded-2xl">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="font-semibold text-muted-foreground">{t("dashboard.invoices.empty", "Aucune facture")}</h3>
            <p className="text-sm text-muted-foreground">{t("dashboard.invoices.empty_hint", "Les factures seront générées automatiquement après validation de vos commandes.")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((inv, i) => (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border p-4 rounded-xl hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold">{inv.number}</h3>
                        <Badge className={statusBadge[inv.status] || ""}>
                          {inv.status === "DRAFT" ? "Brouillon" : inv.status === "SENT" ? "Envoyée" : inv.status === "PAID" ? "Payée" : inv.status === "OVERDUE" ? "En retard" : "Annulée"}
                        </Badge>
                        <Badge variant="outline">{typeLabel[inv.type] || inv.type}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
                    <p className="text-lg font-bold">${inv.total_amount?.toLocaleString()}</p>
                    {inv.file_url && (
                      <a href={inv.file_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-2">
                          <Download className="w-4 h-4" />
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
    </div>
  )
}
