"use client"

import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n-context"
import {
  Calendar,
  Check,
  ExternalLink,
  Loader2,
  ReceiptText,
  User,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { PAYMENT_PROOF_STATUS, statusBadge } from "@/lib/design/status"

type Proof = {
  id: string
  order_id: string
  file_name_original: string | null
  declared_amount: number | null
  declared_currency: string | null
  status: "PENDING_REVIEW" | "ACCEPTED" | "REJECTED" | "SUPERSEDED"
  rejected_reason: string | null
  reviewed_at: string | null
  uploaded_at: string
  order_reference: string | null
  uploader_email: string | null
  uploader_full_name: string | null
}

const MIN_REASON_LENGTH = 10


function formatAmount(proof: Proof) {
  if (proof.declared_amount == null) return "—"
  // La devise déclarée fait foi ; l'USD n'est qu'un défaut, jamais une conversion.
  const currency = proof.declared_currency || "USD"
  return `${proof.declared_amount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} ${currency}`
}

export default function AdminPaymentProofsPage() {
  const { t } = useLanguage()
  const [pending, setPending] = useState<Proof[]>([])
  const [reviewed, setReviewed] = useState<Proof[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [reason, setReason] = useState("")

  const load = useCallback(async () => {
    try {
      const [pendingRes, reviewedRes] = await Promise.all([
        fetch("/api/admin/payment-proofs?status=pending"),
        fetch("/api/admin/payment-proofs?status=reviewed"),
      ])

      if (!pendingRes.ok || !reviewedRes.ok) {
        throw new Error("fetch failed")
      }

      setPending((await pendingRes.json()).proofs ?? [])
      setReviewed((await reviewedRes.json()).proofs ?? [])
    } catch {
      toast.error(t("admin.proofs.load_error", "Impossible de charger les justificatifs"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  async function openProof(id: string) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/payment-proofs/${id}/signed-url`, { method: "POST" })
      const body = await res.json()

      if (!res.ok) {
        toast.error(body.error ?? t("admin.proofs.link_error", "Lien indisponible"))
        return
      }

      window.open(body.url, "_blank", "noopener,noreferrer")
    } finally {
      setBusyId(null)
    }
  }

  async function review(id: string, decision: "ACCEPT" | "REJECT") {
    if (decision === "REJECT" && reason.trim().length < MIN_REASON_LENGTH) {
      toast.error(
        t("admin.proofs.reason_too_short", `Le motif doit faire au moins ${MIN_REASON_LENGTH} caractères`)
      )
      return
    }

    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/payment-proofs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          decision === "ACCEPT" ? { decision } : { decision, rejected_reason: reason.trim() }
        ),
      })
      const body = await res.json()

      if (!res.ok) {
        toast.error(body.error ?? t("admin.proofs.review_error", "La décision n'a pas pu être enregistrée"))
        return
      }

      toast.success(
        decision === "ACCEPT"
          ? t("admin.proofs.accepted", "Justificatif validé")
          : t("admin.proofs.rejected", "Justificatif refusé")
      )
      setRejecting(null)
      setReason("")
      await load()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {t("admin.proofs.title", "Justificatifs de paiement")}
        </h1>
        <p className="text-foreground/40 text-sm">
          {t(
            "admin.proofs.subtitle",
            "Validez ou refusez les preuves de virement déposées par les acheteurs. Chaque consultation d'une pièce est journalisée."
          )}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground/50">
              {t("admin.proofs.pending", "En attente")} ({pending.length})
            </h2>

            {pending.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-foreground/10 rounded-2xl">
                <ReceiptText className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
                <h3 className="font-semibold text-foreground/50">
                  {t("admin.proofs.empty", "Aucun justificatif en attente")}
                </h3>
                <p className="text-sm text-foreground/30">
                  {t("admin.proofs.empty_hint", "Les dépôts des acheteurs apparaissent ici dès leur envoi.")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((proof, i) => (
                  <motion.div
                    key={proof.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-foreground/5 border border-foreground/10 p-4 rounded-xl"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <ReceiptText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-foreground">
                              {proof.order_reference || proof.order_id.slice(0, 8)}
                            </span>
                            <Badge className={statusBadge(PAYMENT_PROOF_STATUS, proof.status)}>
                              {t("admin.proofs.status.pending", "En attente")}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-foreground/40">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(proof.uploaded_at).toLocaleDateString("fr-FR")}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {proof.uploader_full_name || proof.uploader_email || "—"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-foreground">{formatAmount(proof)}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-foreground/10 text-foreground/70 hover:text-foreground"
                          disabled={busyId === proof.id}
                          onClick={() => openProof(proof.id)}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          {t("admin.proofs.view", "Voir")}
                        </Button>
                        <Button
                          size="sm"
                          className="bg-success/20 text-success hover:bg-success/30"
                          disabled={busyId === proof.id}
                          onClick={() => review(proof.id, "ACCEPT")}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          {t("admin.proofs.accept", "Valider")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-destructive/40 text-destructive hover:bg-destructive/10"
                          disabled={busyId === proof.id}
                          onClick={() => {
                            setRejecting(rejecting === proof.id ? null : proof.id)
                            setReason("")
                          }}
                        >
                          <X className="w-4 h-4 mr-1" />
                          {t("admin.proofs.reject", "Refuser")}
                        </Button>
                      </div>
                    </div>

                    {rejecting === proof.id && (
                      <div className="mt-4 border-t border-foreground/10 pt-4">
                        <label
                          htmlFor={`reason-${proof.id}`}
                          className="mb-2 block text-xs uppercase tracking-wider text-foreground/50"
                        >
                          {t("admin.proofs.reason_label", "Motif du refus")}
                        </label>
                        <Textarea
                          id={`reason-${proof.id}`}
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          minLength={MIN_REASON_LENGTH}
                          rows={3}
                          placeholder={t(
                            "admin.proofs.reason_placeholder",
                            "Le motif est transmis à l'acheteur — soyez précis."
                          )}
                          className="bg-foreground/5 border-foreground/10 text-foreground placeholder:text-foreground/30"
                        />
                        <div className="mt-3 flex items-center gap-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-destructive/40 text-destructive hover:bg-destructive/10"
                            disabled={busyId === proof.id || reason.trim().length < MIN_REASON_LENGTH}
                            onClick={() => review(proof.id, "REJECT")}
                          >
                            {busyId === proof.id && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                            {t("admin.proofs.confirm_reject", "Confirmer le refus")}
                          </Button>
                          <span className="text-xs text-foreground/30">
                            {reason.trim().length}/{MIN_REASON_LENGTH}
                          </span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground/50">
              {t("admin.proofs.recent", "Décisions récentes")}
            </h2>

            {reviewed.length === 0 ? (
              <p className="text-sm text-foreground/30">
                {t("admin.proofs.no_recent", "Aucune décision enregistrée pour le moment.")}
              </p>
            ) : (
              <div className="space-y-2">
                {reviewed.map((proof) => (
                  <div
                    key={proof.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={statusBadge(PAYMENT_PROOF_STATUS, proof.status)}>
                        {proof.status === "ACCEPTED"
                          ? t("admin.proofs.status.accepted", "Validé")
                          : t("admin.proofs.status.rejected", "Refusé")}
                      </Badge>
                      <span className="text-sm text-foreground/70">
                        {proof.order_reference || proof.order_id.slice(0, 8)}
                      </span>
                      <span className="text-xs text-foreground/35">
                        {proof.uploader_full_name || proof.uploader_email || "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      {proof.rejected_reason && (
                        <span className="max-w-[420px] truncate text-xs text-foreground/40" title={proof.rejected_reason}>
                          {proof.rejected_reason}
                        </span>
                      )}
                      <span className="text-xs text-foreground/35">
                        {proof.reviewed_at ? new Date(proof.reviewed_at).toLocaleDateString("fr-FR") : "—"}
                      </span>
                      <span className="text-sm font-semibold text-foreground">{formatAmount(proof)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
