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
  FolderOpen,
  Filter,
  File,
  FileImage,
  FileSpreadsheet,
  FileArchive,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DashboardHeader } from "@/components/dashboard/header"
import { createClient } from "@/lib/supabase/client"

const docTypeLabel: Record<string, string> = {
  PROFORMA_INVOICE: "Facture Proforma",
  COMMERCIAL_INVOICE: "Facture Commerciale",
  PACKING_LIST: "Liste de Colisage",
  INSPECTION_REPORT: "Rapport d'Inspection",
  BILL_OF_LADING: "Connaissement",
  CERTIFICATE_ORIGIN: "Certificat d'Origine",
  PAYMENT_RECEIPT: "Reçu de Paiement",
  COMPLIANCE_REPORT: "Rapport de Conformité",
  PASSPORT: "Passeport",
  ID_CARD: "Carte d'Identité",
  COMPANY_REGISTRATION: "Registre de Commerce",
  PROOF_OF_ADDRESS: "Justificatif de Domicile",
  OTHER: "Autre",
}

const docIcon = (type?: string) => {
  if (!type) return <File className="w-4 h-4" />
  if (type.includes("INVOICE") || type.includes("RECEIPT")) return <FileText className="w-4 h-4" />
  if (type.includes("LIST") || type.includes("REPORT")) return <FileSpreadsheet className="w-4 h-4" />
  if (type.includes("CERTIFICATE")) return <FileImage className="w-4 h-4" />
  return <FileArchive className="w-4 h-4" />
}

export default function DashboardDocumentsPage() {
  const { t } = useLanguage()
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")

  useEffect(() => {
    async function fetchDocuments() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: requests } = await supabase
        .from("import_requests")
        .select("id, reference")
        .eq("buyer_id", user.id)

      if (!requests) { setLoading(false); return }

      const requestIds = requests.map(r => r.id)

      const { data: docs } = await supabase
        .from("request_documents")
        .select("*")
        .in("request_id", requestIds)
        .order("created_at", { ascending: false })

      if (!docs) { setLoading(false); return }

      const docsWithRef = docs.map(d => ({
        ...d,
        request_ref: requests.find(r => r.id === d.request_id)?.reference || "N/A",
      }))

      setDocuments(docsWithRef)
      setLoading(false)
    }
    fetchDocuments()
  }, [])

  const filtered = documents.filter(d => {
    const matchSearch = d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.request_ref?.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === "all" || d.document_type === typeFilter
    return matchSearch && matchType
  })

  const uniqueTypes = [...new Set(documents.map(d => d.document_type).filter(Boolean))]

  return (
    <div>
      <DashboardHeader
        title={t("dashboard.documents.title", "Mes Documents")}
        subtitle={t("dashboard.documents.subtitle", "Tous vos documents d'importation centralisés")}
      />

      <div className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("dashboard.documents.search", "Rechercher un document...")}
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder={t("dashboard.documents.filter_type", "Type")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("dashboard.documents.all_types", "Tous les types")}</SelectItem>
              {uniqueTypes.map(type => (
                <SelectItem key={type} value={type}>{docTypeLabel[type] || type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-border rounded-2xl">
            <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="font-semibold text-muted-foreground">{t("dashboard.documents.empty", "Aucun document")}</h3>
            <p className="text-sm text-muted-foreground">{t("dashboard.documents.empty_hint", "Les documents liés à vos demandes apparaîtront ici.")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((doc, i) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card border border-border p-4 rounded-xl hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0">
                      {docIcon(doc.document_type)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{doc.name || "Document"}</h4>
                        {doc.document_type && (
                          <Badge variant="outline" className="text-[10px] flex-shrink-0">
                            {docTypeLabel[doc.document_type] || doc.document_type}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <Link href={`/dashboard/requests/${doc.request_id}`} className="font-mono hover:text-primary">
                          {doc.request_ref}
                        </Link>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(doc.created_at).toLocaleDateString("fr-FR")}
                        </span>
                        {doc.file_size && (
                          <>
                            <span>•</span>
                            <span>{(doc.file_size / 1024).toFixed(0)} KB</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/dashboard/requests/${doc.request_id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </Link>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download>
                      <Button variant="outline" size="icon" className="h-8 w-8">
                        <Download className="w-4 h-4" />
                      </Button>
                    </a>
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
