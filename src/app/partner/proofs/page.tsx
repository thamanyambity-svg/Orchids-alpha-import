"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { DashboardHeader } from "@/components/dashboard/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DocumentUploadModal } from "@/components/partner/document-upload-modal"
import { Loader2, Upload, FileText, Package } from "lucide-react"

export default function PartnerProofsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<any[]>([])
  const [openReqId, setOpenReqId] = useState<string | null>(null)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: pp } = await supabase.from("partner_profiles").select("id").eq("user_id", user.id).maybeSingle()
    if (!pp) { setLoading(false); return }
    const { data } = await supabase
      .from("import_requests")
      .select("id, reference, product_name, category, status, request_documents ( id, type, file_name, status, created_at )")
      .eq("assigned_partner_id", pp.id)
      .order("created_at", { ascending: false })
    setRequests(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  return (
    <div>
      <DashboardHeader title="Upload preuves" subtitle="Téléversez les preuves du travail effectué (factures, packing list, B/L, inspection…)" />
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-border rounded-2xl">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="font-semibold text-muted-foreground">Aucun dossier assigné</h3>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((r) => (
              <div key={r.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div>
                    <p className="font-semibold">{r.product_name || r.category}</p>
                    <span className="font-mono text-xs text-muted-foreground">{r.reference}</span>
                    <Badge variant="outline" className="ml-2 text-[10px]">{r.status}</Badge>
                  </div>
                  <Button size="sm" onClick={() => setOpenReqId(r.id)}>
                    <Upload className="w-4 h-4 mr-2" /> Téléverser une preuve
                  </Button>
                </div>
                <div className="space-y-1">
                  {(r.request_documents || []).length === 0 && <p className="text-xs text-muted-foreground">Aucune preuve téléversée.</p>}
                  {(r.request_documents || []).map((d: any) => (
                    <div key={d.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="w-3 h-3" />
                      <span className="font-medium text-foreground">{d.type}</span>
                      <span>· {d.file_name}</span>
                      <Badge variant="outline" className="text-[9px]">{d.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {openReqId && (
        <DocumentUploadModal
          requestId={openReqId}
          open={!!openReqId}
          onOpenChange={(o) => { if (!o) setOpenReqId(null) }}
          onSuccess={() => { setOpenReqId(null); load() }}
        />
      )}
    </div>
  )
}
