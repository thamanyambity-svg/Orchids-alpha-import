"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n-context"
import {
  Shield,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  FileText,
  ExternalLink,
  Download,
  Mail,
  Phone,
  MapPin,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export default function BuyerKycPage() {
  const { t } = useLanguage()
  const [buyers, setBuyers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedBuyer, setSelectedBuyer] = useState<any>(null)
  const [kycDocs, setKycDocs] = useState<any[]>([])
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchBuyersWithKyc()
  }, [])

  async function fetchBuyersWithKyc() {
    const supabase = createClient()
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "BUYER")
      .order("created_at", { ascending: false })

    if (!profiles) { setLoading(false); return }

    const profileIds = profiles.map(p => p.id)

    const { data: buyerProfiles } = await supabase
      .from("buyer_profiles")
      .select("*")
      .in("user_id", profileIds)

    const buyerMap = new Map((buyerProfiles || []).map(bp => [bp.user_id, bp]))

    const { data: docs } = await supabase
      .from("request_documents")
      .select("*")
      .eq("service", "COMPLIANCE")
      .is("request_id", null)

    const docsByUser = new Map<string, any[]>()
    for (const doc of docs || []) {
      const existing = docsByUser.get(doc.uploaded_by) || []
      existing.push(doc)
      docsByUser.set(doc.uploaded_by, existing)
    }

    const buyersWithKyc = profiles.map(p => {
      const bp = buyerMap.get(p.id)
      const userDocs = docsByUser.get(p.id) || []
      return {
        ...p,
        kyc_status: bp?.kyc_status || "NOT_STARTED",
        kyc_documents: userDocs,
        total_docs: userDocs.length,
      }
    })

    setBuyers(buyersWithKyc)
    setLoading(false)
  }

  async function handleVerify(buyerId: string) {
    setActionLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("buyer_profiles")
      .update({ kyc_status: "VERIFIED" })
      .eq("user_id", buyerId)

    if (error) {
      toast.error("Erreur lors de la vérification")
    } else {
      toast.success("KYC vérifié avec succès")
      setBuyers(prev => prev.map(b => b.id === buyerId ? { ...b, kyc_status: "VERIFIED" } : b))
      if (selectedBuyer?.id === buyerId) {
        setSelectedBuyer((prev: any) => prev ? { ...prev, kyc_status: "VERIFIED" } : null)
      }
    }
    setActionLoading(false)
  }

  async function handleReject(buyerId: string) {
    const reason = window.prompt("Motif du refus :")
    if (!reason) return

    setActionLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("buyer_profiles")
      .update({ kyc_status: "REJECTED" })
      .eq("user_id", buyerId)

    if (error) {
      toast.error("Erreur")
    } else {
      toast.success("KYC refusé")
      setBuyers(prev => prev.map(b => b.id === buyerId ? { ...b, kyc_status: "REJECTED" } : b))
      if (selectedBuyer?.id === buyerId) {
        setSelectedBuyer((prev: any) => prev ? { ...prev, kyc_status: "REJECTED" } : null)
      }
    }
    setActionLoading(false)
  }

  function viewDocs(buyer: any) {
    setSelectedBuyer(buyer)
    setKycDocs(buyer.kyc_documents || [])
  }

  const filtered = buyers.filter(b =>
    b.email?.toLowerCase().includes(search.toLowerCase()) ||
    b.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.company_name?.toLowerCase().includes(search.toLowerCase())
  )

  const kycStatusBadge: Record<string, { class: string; label: string; icon: any }> = {
    NOT_STARTED: { class: "bg-muted text-muted-foreground", label: "Non commencé", icon: Clock },
    IN_PROGRESS: { class: "bg-primary/10 text-primary", label: "En cours", icon: Clock },
    VERIFIED: { class: "bg-success/10 text-success", label: "Vérifié", icon: CheckCircle2 },
    REJECTED: { class: "bg-destructive/10 text-destructive", label: "Refusé", icon: XCircle },
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">{t("admin.kyc.title", "Vérification KYC")}</h1>
        <p className="text-white/40 text-sm">{t("admin.kyc.subtitle", "Vérifiez les documents d'identité des acheteurs")}</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <Input
          placeholder={t("admin.kyc.search", "Rechercher un acheteur...")}
          className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#ffd700]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-white/10 rounded-2xl">
              <Shield className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <h3 className="font-semibold text-white/50">{t("admin.kyc.empty", "Aucun acheteur à vérifier")}</h3>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((buyer, i) => {
                const status = kycStatusBadge[buyer.kyc_status] || kycStatusBadge.NOT_STARTED
                const Icon = status.icon
                return (
                  <motion.div
                    key={buyer.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`bg-white/5 border p-4 rounded-xl transition-colors cursor-pointer hover:bg-white/[0.07] ${
                      selectedBuyer?.id === buyer.id ? "border-[#ffd700]/50" : "border-white/10"
                    }`}
                    onClick={() => viewDocs(buyer)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#ffd700]/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-[#ffd700]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-white">{buyer.full_name || "N/A"}</span>
                            <Badge className={status.class}>
                              <Icon className="w-3 h-3 mr-1" />
                              {status.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-white/40">
                            <span>{buyer.email}</span>
                            <span>•</span>
                            <span>{buyer.total_docs} document(s)</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/10 text-white/60"
                        onClick={(e) => { e.stopPropagation(); viewDocs(buyer) }}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        {t("admin.kyc.view_docs", "Documents")}
                      </Button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          {selectedBuyer ? (
            <div>
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
                <div className="w-12 h-12 rounded-full bg-[#ffd700]/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-[#ffd700]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{selectedBuyer.full_name || "N/A"}</h3>
                  <p className="text-xs text-white/40">{selectedBuyer.email}</p>
                </div>
              </div>

              <div className="space-y-2 mb-4 text-xs text-white/60">
                {selectedBuyer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3" /> {selectedBuyer.phone}
                  </div>
                )}
                {selectedBuyer.city && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3" /> {selectedBuyer.city}
                  </div>
                )}
              </div>

              <div className="space-y-2 mb-6">
                <h4 className="text-xs text-white/40 uppercase tracking-wider mb-2">
                  {t("admin.kyc.documents_title", "Documents soumis")} ({kycDocs.length})
                </h4>
                {kycDocs.length === 0 ? (
                  <p className="text-xs text-white/30 italic">{t("admin.kyc.no_docs", "Aucun document soumis")}</p>
                ) : (
                  kycDocs.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-white/40" />
                        <span className="text-xs text-white/70 truncate max-w-[120px]">{doc.name || "Document"}</span>
                      </div>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3 text-white/40 hover:text-white" />
                      </a>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                {selectedBuyer.kyc_status !== "VERIFIED" && (
                  <Button
                    size="sm"
                    className="flex-1 bg-success hover:bg-success/90 text-white"
                    onClick={() => handleVerify(selectedBuyer.id)}
                    disabled={actionLoading}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    {t("admin.kyc.verify", "Vérifier")}
                  </Button>
                )}
                {selectedBuyer.kyc_status !== "REJECTED" && selectedBuyer.kyc_status !== "NOT_STARTED" && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleReject(selectedBuyer.id)}
                    disabled={actionLoading}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    {t("admin.kyc.reject", "Refuser")}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center">
              <Shield className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <p className="text-sm text-white/40">{t("admin.kyc.select_buyer", "Sélectionnez un acheteur pour voir ses documents")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
