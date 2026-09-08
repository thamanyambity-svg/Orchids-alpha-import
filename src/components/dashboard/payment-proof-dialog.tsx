"use client"

import { useState } from "react"
import { Loader2, Upload } from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/lib/i18n-context"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const BUCKET = "documents"
const MAX_FILE_BYTES = 10 * 1024 * 1024
const ACCEPTED = "application/pdf,image/png,image/jpeg"

type Props = {
  orderId: string
  orderReference?: string | null
  /** Preuve refusée que ce dépôt remplace, s'il s'agit d'une re-soumission. */
  supersedesProofId?: string
  onUploaded?: () => void
}

/**
 * Dépôt d'une preuve de virement par l'acheteur.
 *
 * Le fichier part directement vers le stockage (l'acheteur est authentifié, le
 * bucket est soumis aux policies), puis la ligne est créée par l'API, qui pose
 * `uploaded_by` et laisse la policy vérifier que la commande lui appartient.
 */
export function PaymentProofDialog({ orderId, orderReference, supersedesProofId, onUploaded }: Props) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [uploading, setUploading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    if (file.size > MAX_FILE_BYTES) {
      toast.error(t("proof.too_large", "Le fichier dépasse 10 Mo."))
      return
    }

    setUploading(true)
    try {
      const supabase = createClient()
      const extension = file.name.split(".").pop() ?? "bin"
      const path = `payment-proofs/${orderId}/${Date.now()}.${extension}`

      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file)
      if (uploadError) {
        toast.error(uploadError.message)
        return
      }

      const parsedAmount = amount.trim() ? Number(amount) : undefined

      const res = await fetch("/api/payment-proofs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          file_path: path,
          file_name_original: file.name,
          file_size_bytes: file.size,
          file_mime_type: file.type || undefined,
          declared_amount: Number.isFinite(parsedAmount) ? parsedAmount : undefined,
          declared_currency: currency,
          supersedes_proof_id: supersedesProofId,
        }),
      })

      if (!res.ok) {
        // La ligne n'a pas été créée : on retire le fichier orphelin plutôt que
        // de laisser un document sensible sans propriétaire dans le bucket.
        await supabase.storage.from(BUCKET).remove([path])
        const body = await res.json().catch(() => ({}))
        toast.error(body.error ?? t("proof.error", "Le dépôt a échoué."))
        return
      }

      toast.success(t("proof.sent", "Justificatif envoyé. L'équipe finance le vérifie."))
      setOpen(false)
      setFile(null)
      setAmount("")
      onUploaded?.()
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
          <Upload className="w-4 h-4 me-1" />
          {t("proof.cta", "Envoyer un justificatif")}
        </Button>
      </DialogTrigger>

      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{t("proof.title", "Justificatif de paiement")}</DialogTitle>
          <DialogDescription>
            {orderReference
              ? t("proof.subtitle_ref", "Commande {ref}").replace("{ref}", orderReference)
              : t("proof.subtitle", "Joignez la preuve de votre virement.")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="proof-file">{t("proof.file", "Fichier (PDF ou image, 10 Mo max)")}</Label>
            <Input
              id="proof-file"
              type="file"
              accept={ACCEPTED}
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="space-y-2">
              <Label htmlFor="proof-amount">{t("proof.amount", "Montant viré")}</Label>
              <Input
                id="proof-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proof-currency">{t("proof.currency", "Devise")}</Label>
              <Input
                id="proof-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
                className="w-20"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={uploading || !file}>
              {uploading && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {t("proof.submit", "Envoyer")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
