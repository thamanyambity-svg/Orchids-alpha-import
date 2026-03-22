"use client"

import { useState } from "react"
import { Loader2, Check, X, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  reviewPaymentProof,
  getPaymentProofSignedUrl,
  type PaymentProofAdminRow,
} from "@/app/actions/payment-proofs"
import { toast } from "sonner"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

type Props = {
  proof: PaymentProofAdminRow
  onProcessed: () => void
}

export function ProofReviewCard({ proof, onProcessed }: Props) {
  const [rejectReason, setRejectReason] = useState("")
  const [loading, setLoading] = useState<null | "url" | "accept" | "reject">(null)

  async function openSignedUrl() {
    setLoading("url")
    const res = await getPaymentProofSignedUrl(proof.id)
    setLoading(null)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    window.open(res.data.url, "_blank", "noopener,noreferrer")
    toast.success(`Lien valable ${Math.floor(res.data.expiresIn / 60)} min`)
  }

  async function accept() {
    setLoading("accept")
    const res = await reviewPaymentProof({ id: proof.id, decision: "ACCEPT" })
    setLoading(null)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success("Preuve acceptée")
    onProcessed()
  }

  async function reject() {
    if (rejectReason.trim().length < 10) {
      toast.error("La raison du refus doit faire au moins 10 caractères.")
      return
    }
    setLoading("reject")
    const res = await reviewPaymentProof({
      id: proof.id,
      decision: "REJECT",
      rejectionReason: rejectReason.trim(),
    })
    setLoading(null)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    toast.success("Preuve refusée — le client a été notifié")
    onProcessed()
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
            En attente
          </Badge>
          <p className="text-white font-mono text-sm mt-2">
            Commande{" "}
            <span className="text-[#ffd700]">
              {proof.order_reference ?? proof.order_id.slice(0, 8)}
            </span>
          </p>
          <p className="text-xs text-white/50">
            {proof.user_email ?? proof.user_id}{" "}
            {proof.user_full_name ? `· ${proof.user_full_name}` : ""}
          </p>
          <p className="text-xs text-white/40 mt-1">
            {format(new Date(proof.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
          </p>
        </div>
        {proof.amount_claimed != null && (
          <p className="text-lg font-mono text-white">
            {proof.amount_claimed.toLocaleString("fr-FR")} {proof.currency}
          </p>
        )}
      </div>
      <p className="text-xs text-white/40 truncate" title={proof.file_path}>
        {proof.file_name ?? proof.file_path}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={openSignedUrl}
          disabled={loading !== null}
          className="border-white/20 text-white/80"
        >
          {loading === "url" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <ExternalLink className="w-4 h-4 mr-2" />
              Ouvrir (URL signée 1h)
            </>
          )}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={accept}
          disabled={loading !== null}
          className="bg-emerald-600 hover:bg-emerald-500 text-white"
        >
          {loading === "accept" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Valider
            </>
          )}
        </Button>
      </div>
      <div className="border-t border-white/10 pt-4 space-y-2">
        <Label className="text-white/70 text-xs">Refus — motif (min. 10 caractères)</Label>
        <Textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          className="bg-white/5 border-white/10 text-white min-h-[80px]"
          placeholder="Ex. document illisible, montant incohérent…"
        />
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={reject}
          disabled={loading !== null}
        >
          {loading === "reject" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <X className="w-4 h-4 mr-2" />
              Refuser
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
