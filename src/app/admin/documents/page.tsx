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
  User,
  ChevronRight,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  OTHER: "Autre",
}

export default function AdminDocumentsPage() {
  const { t } = useLanguage()
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")

  useEffect(() => {
    async function fetchDocuments() {
      const supabase = createClient()
      const { data: docs } = await supabase
        .from("request_documents")
        .select(`*, import_requests(reference)`)
        .order("created_at", { ascending: false })
        .limit(200)

      if (docs) setDocuments(docs)
      setLoading(false)
    }
    fetchDocuments()
  }, [])

  const filtered = documents.filter(d => {
    const matchSearch = d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.import_requests?.reference?.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === "all" || d.document_type === typeFilter
    return matchSearch && matchType
  })

  const uniqueTypes = [...new Set(documents.map(d => d.document_type).filter(Boolean))]

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">{t("admin.documents.title", "Documents")}</h1>
        <p className="text-white/40 text-sm">{t("admin.documents.subtitle", "Tous les documents déposés sur la plateforme")}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            placeholder={t("admin.documents.search", "Rechercher un document...")}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px] bg-white/5 border-white/10 text-white">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.documents.all_types", "Tous")}</SelectItem>
            {uniqueTypes.map(type => (
              <SelectItem key={type} value={type}>{docTypeLabel[type] || type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#ffd700]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-white/10 rounded-2xl">
          <FolderOpen className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="font-semibold text-white/50">{t("admin.documents.empty", "Aucun document")}</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc, i) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/[0.07] transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#ffd700]/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-[#ffd700]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-white truncate">{doc.name || "Document"}</h4>
                      {doc.document_type && (
                        <Badge variant="outline" className="border-white/20 text-white/60 text-[10px]">
                          {docTypeLabel[doc.document_type] || doc.document_type}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/40">
                      {doc.import_requests?.reference && (
                        <span className="font-mono">{doc.import_requests.reference}</span>
                      )}
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(doc.created_at).toLocaleDateString("fr-FR")}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {doc.uploaded_by?.slice(0, 8)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {doc.request_id && (
                    <Link href={`/admin/requests/${doc.request_id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </Link>
                  )}
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download>
                    <Button variant="outline" size="icon" className="h-8 w-8 border-white/10 text-white/40 hover:text-white">
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
  )
}
