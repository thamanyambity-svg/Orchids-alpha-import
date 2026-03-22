"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { ProofStatus } from "@/types/finance"

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Données minimales de la preuve transmises depuis le Server Component.
 * file_path jamais exposé côté client — accès via signed URL uniquement.
 */
export interface ProofDisplayData {
  id: string
  status: ProofStatus
  uploaded_at: string
  rejected_reason: string | null
  reviewed_at: string | null
  declared_amount: number | null
  declared_currency: string | null
  file_name_original: string | null
}

interface ProofStatusBannerProps {
  /** Dernière preuve active pour cette commande. null = aucune preuve soumise */
  proof: ProofDisplayData | null
  /** Déclenché au clic sur "Soumettre une nouvelle preuve" (REJECTED) */
  onResubmit: () => void
  /** Déclenché au clic sur "Joindre ma preuve" (premier upload) */
  onFirstUpload: () => void
}

// ─── Utilitaires d'affichage ──────────────────────────────────────────────────

function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoString))
}

function formatAmount(
  amount: number | null,
  currency: string | null
): string {
  if (amount == null || !currency) return "—"
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

/**
 * Mappe le statut vers les propriétés d'affichage du Badge.
 * Aligné sur la migration réelle : ACCEPTED (pas VERIFIED).
 */
function getStatusBadge(status: ProofStatus): {
  label: string
  variant: "default" | "secondary" | "destructive" | "outline"
  emoji: string
} {
  switch (status) {
    case "PENDING_REVIEW":
      return { label: "En cours de vérification", variant: "secondary", emoji: "⏳" }
    case "ACCEPTED":
      return { label: "Validée", variant: "default", emoji: "✓" }
    case "REJECTED":
      return { label: "Refusée", variant: "destructive", emoji: "✗" }
    case "SUPERSEDED":
      return { label: "Remplacée", variant: "outline", emoji: "↩" }
  }
}

// ─── Sous-composant : Métadonnées communes ────────────────────────────────────

function ProofMetadata({ proof }: { proof: ProofDisplayData }) {
  return (
    <dl className="grid gap-3 text-sm">
      {proof.file_name_original && (
        <div>
          <dt className="text-muted-foreground font-medium">Fichier</dt>
          <dd>{proof.file_name_original}</dd>
        </div>
      )}
      {proof.declared_amount != null && proof.declared_currency && (
        <div>
          <dt className="text-muted-foreground font-medium">Montant déclaré</dt>
          <dd>{formatAmount(proof.declared_amount, proof.declared_currency)}</dd>
        </div>
      )}
      <div>
        <dt className="text-muted-foreground font-medium">Soumis le</dt>
        <dd>
          <time dateTime={proof.uploaded_at}>{formatDate(proof.uploaded_at)}</time>
        </dd>
      </div>
    </dl>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

/**
 * ProofStatusBanner — Affichage du statut de la preuve de paiement
 *
 * 5 états couverts :
 * - null           → Bouton premier upload
 * - PENDING_REVIEW → Badge + date de soumission
 * - ACCEPTED       → Badge succès + date de validation
 * - REJECTED       → Badge erreur + motif + bouton re-soumission
 * - SUPERSEDED     → Badge neutre (preuve archivée)
 *
 * Zéro appel Supabase direct — données reçues en props depuis Server Component.
 */
export function ProofStatusBanner({
  proof,
  onResubmit,
  onFirstUpload,
}: ProofStatusBannerProps) {
  if (!proof) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preuve de paiement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Aucune preuve de paiement soumise pour cette commande.
          </p>
          <Button
            variant="default"
            onClick={onFirstUpload}
            aria-label="Joindre une preuve de paiement pour cette commande"
          >
            Joindre ma preuve de paiement
          </Button>
        </CardContent>
      </Card>
    )
  }

  const statusBadge = getStatusBadge(proof.status)

  const headerRow = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <CardTitle className="text-lg">
        {proof.status === "SUPERSEDED"
          ? "Preuve de paiement (archivée)"
          : "Preuve de paiement"}
      </CardTitle>
      <Badge variant={statusBadge.variant} aria-label={`Statut : ${statusBadge.label}`}>
        {statusBadge.emoji} {statusBadge.label}
      </Badge>
    </div>
  )

  if (proof.status === "PENDING_REVIEW") {
    return (
      <Card>
        <CardHeader>{headerRow}</CardHeader>
        <CardContent className="space-y-4">
          <p role="status" aria-live="polite" className="text-sm">
            Votre justificatif est en cours de vérification par notre équipe. Vous recevrez une
            notification dès qu&apos;il aura été traité.
          </p>
          <Separator />
          <ProofMetadata proof={proof} />
        </CardContent>
      </Card>
    )
  }

  if (proof.status === "ACCEPTED") {
    return (
      <Card>
        <CardHeader>{headerRow}</CardHeader>
        <CardContent className="space-y-4">
          <p role="status" className="text-sm">
            Votre justificatif a été vérifié et accepté.
          </p>
          {proof.reviewed_at && (
            <p className="text-sm text-muted-foreground">
              Validé le{" "}
              <time dateTime={proof.reviewed_at}>{formatDate(proof.reviewed_at)}</time>
            </p>
          )}
          <Separator />
          <ProofMetadata proof={proof} />
        </CardContent>
      </Card>
    )
  }

  if (proof.status === "REJECTED") {
    return (
      <Card>
        <CardHeader>{headerRow}</CardHeader>
        <CardContent className="space-y-4">
          {proof.rejected_reason && (
            <div role="alert" aria-live="assertive" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <p className="font-semibold">Motif du refus</p>
              <p className="mt-1">{proof.rejected_reason}</p>
            </div>
          )}

          <Separator />
          <ProofMetadata proof={proof} />
          <Separator />

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Vous pouvez soumettre un nouveau justificatif en tenant compte du motif indiqué
              ci-dessus.
            </p>
            <Button
              variant="default"
              onClick={onResubmit}
              aria-label="Soumettre un nouveau justificatif de paiement"
            >
              Soumettre une nouvelle preuve
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>{headerRow}</CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Cette preuve a été remplacée par une version plus récente.
        </p>
        <Separator />
        <ProofMetadata proof={proof} />
      </CardContent>
    </Card>
  )
}
