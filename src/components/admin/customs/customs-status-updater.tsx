"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useServerAction } from "@/hooks/use-server-action"
import { updateCustomsStatus } from "@/app/actions/customs/update-customs-status"
import { verifyTransitionAllowed } from "@/lib/customs/transition-matrix"
import type { CustomsFileStatus } from "@/lib/customs/types"
import { getStatusBadgeVariant, getStatusLabel } from "@/lib/customs/status-display"

interface CustomsStatusUpdaterProps {
  customsFileId: string
  currentStatus: CustomsFileStatus
  userRole: string
}

const ACTION_LABELS: Partial<Record<CustomsFileStatus, string>> = {
  PRE_ADVICE: "Envoyer la pré-alerte",
  IN_CUSTOMS: "Soumettre en douane",
  LIQUIDATED: "Marquer comme liquidé",
  PAID: "Confirmer le paiement",
  RELEASED: "Libérer la marchandise",
  BLOCKED: "Bloquer le dossier",
  DRAFT: "Remettre en brouillon",
}

export function CustomsStatusUpdater({
  customsFileId,
  currentStatus,
  userRole,
}: CustomsStatusUpdaterProps) {
  const router = useRouter()

  const ALL_STATUSES: CustomsFileStatus[] = [
    "DRAFT",
    "PRE_ADVICE",
    "IN_CUSTOMS",
    "LIQUIDATED",
    "PAID",
    "RELEASED",
    "BLOCKED",
  ]

  const allowedTargets = ALL_STATUSES.filter((target) => {
    const check = verifyTransitionAllowed(currentStatus, target, userRole)
    return check.allowed
  })

  const [selectedTarget, setSelectedTarget] = useState<CustomsFileStatus | null>(null)
  const [reason, setReason] = useState("")
  const [reasonError, setReasonError] = useState<string | null>(null)

  const { execute, isPending, error, isSuccess, reset } =
    useServerAction(updateCustomsStatus)

  useEffect(() => {
    if (isSuccess) {
      setSelectedTarget(null)
      setReason("")
      reset()
      router.refresh()
    }
  }, [isSuccess, reset, router])

  const handleConfirm = useCallback(async () => {
    if (!selectedTarget) return

    if (selectedTarget === "BLOCKED") {
      if (!reason.trim() || reason.trim().length < 10) {
        setReasonError(
          "La raison du blocage est obligatoire (10 caractères minimum)."
        )
        return
      }
    }
    setReasonError(null)

    await execute({
      customsFileId,
      newStatus: selectedTarget,
      reason: reason.trim() || undefined,
    })
  }, [selectedTarget, reason, customsFileId, execute])

  const handleDialogClose = useCallback(
    (open: boolean) => {
      if (!open) {
        setSelectedTarget(null)
        setReason("")
        setReasonError(null)
        reset()
      }
    },
    [reset]
  )

  if (allowedTargets.length === 0) {
    return (
      <div>
        <p className="text-sm text-muted-foreground">
          Aucune transition de statut disponible pour ce dossier avec votre rôle
          actuel.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Statut actuel :</span>
        <Badge variant={getStatusBadgeVariant(currentStatus)}>
          {getStatusLabel(currentStatus)}
        </Badge>
      </div>

      <div role="group" aria-label="Transitions de statut disponibles" className="flex flex-wrap gap-2">
        {allowedTargets.map((target) => (
          <Button
            key={target}
            type="button"
            variant={target === "BLOCKED" ? "destructive" : "outline"}
            onClick={() => setSelectedTarget(target)}
            disabled={isPending}
          >
            {ACTION_LABELS[target] ?? getStatusLabel(target)}
          </Button>
        ))}
      </div>

      <Dialog open={selectedTarget !== null} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la transition</DialogTitle>
            <DialogDescription>
              {currentStatus} →{" "}
              <strong>
                {selectedTarget ? getStatusLabel(selectedTarget) : ""}
              </strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="transition-reason">
              {selectedTarget === "BLOCKED"
                ? "Raison du blocage (obligatoire)"
                : "Commentaire (optionnel)"}
            </Label>
            <Textarea
              id="transition-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                if (reasonError) setReasonError(null)
              }}
              placeholder={
                selectedTarget === "BLOCKED"
                  ? "Décrivez la raison du blocage fiscal…"
                  : "Commentaire optionnel sur cette transition…"
              }
              rows={3}
              aria-required={selectedTarget === "BLOCKED"}
              aria-invalid={!!reasonError}
            />
            {reasonError && (
              <p className="text-sm text-destructive" role="alert">
                {reasonError}
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert" aria-live="assertive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogClose(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant={selectedTarget === "BLOCKED" ? "destructive" : "default"}
              onClick={() => void handleConfirm()}
              disabled={isPending}
              aria-busy={isPending}
            >
              {isPending ? "Traitement…" : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
