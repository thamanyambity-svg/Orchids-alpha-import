"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useServerAction } from "@/hooks/use-server-action"
import {
  validateFiscal,
  validateAccounting,
} from "@/app/actions/customs/validate-declaration"

interface ValidationPanelProps {
  declarationId: string
  isFiscalValidated: boolean
  fiscalValidatedByName: string | null
  fiscalValidatedAt: string | null
  isAccountingValidated: boolean
  accountingValidatedByName: string | null
  accountingValidatedAt: string | null
  actorRole: string
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

export function DeclarationValidationPanel({
  declarationId,
  isFiscalValidated,
  fiscalValidatedByName,
  fiscalValidatedAt,
  isAccountingValidated,
  accountingValidatedByName,
  accountingValidatedAt,
  actorRole,
}: ValidationPanelProps) {
  const router = useRouter()

  const fiscalAction = useServerAction(validateFiscal)
  const accountingAction = useServerAction(validateAccounting)

  useEffect(() => {
    if (fiscalAction.isSuccess) {
      fiscalAction.reset()
      router.refresh()
    }
  }, [fiscalAction.isSuccess, fiscalAction, router])

  useEffect(() => {
    if (accountingAction.isSuccess) {
      accountingAction.reset()
      router.refresh()
    }
  }, [accountingAction.isSuccess, accountingAction, router])

  const canValidateFiscal =
    !isFiscalValidated && ["ADMIN", "FISCAL_CONSULTANT"].includes(actorRole)

  const canValidateAccounting =
    isFiscalValidated &&
    !isAccountingValidated &&
    ["ADMIN", "ACCOUNTANT"].includes(actorRole)

  return (
    <Card className="border-white/10 bg-white/5">
      <CardHeader>
        <CardTitle className="text-white">Validations</CardTitle>
      </CardHeader>

      <CardContent className="text-white/80 space-y-6 text-sm">
        <section aria-label="Validation fiscale" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-white">
              Validation fiscale
            </h3>
            <Badge
              variant={isFiscalValidated ? "default" : "secondary"}
              aria-label={
                isFiscalValidated
                  ? "Déclaration validée fiscalement"
                  : "Validation fiscale en attente"
              }
            >
              {isFiscalValidated ? "Validée" : "En attente"}
            </Badge>
          </div>

          {isFiscalValidated ? (
            <dl className="space-y-2">
              <div>
                <dt className="text-white/50">Validé par</dt>
                <dd>{fiscalValidatedByName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-white/50">Le</dt>
                <dd>
                  <time dateTime={fiscalValidatedAt ?? ""}>
                    {formatDate(fiscalValidatedAt)}
                  </time>
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-white/60">
              La validation fiscale verrouille les montants déclarés.
            </p>
          )}

          {canValidateFiscal && (
            <div className="space-y-2">
              {fiscalAction.error && (
                <p className="text-sm text-red-400" role="alert">
                  {fiscalAction.error}
                </p>
              )}
              <Button
                type="button"
                onClick={() => fiscalAction.execute(declarationId)}
                disabled={fiscalAction.isPending}
                aria-busy={fiscalAction.isPending}
              >
                {fiscalAction.isPending
                  ? "Validation en cours…"
                  : "Valider fiscalement"}
              </Button>
            </div>
          )}
        </section>

        <Separator className="bg-white/10" />

        <section aria-label="Validation comptable" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-white">
              Validation comptable
            </h3>
            <Badge
              variant={
                isAccountingValidated
                  ? "default"
                  : isFiscalValidated
                    ? "secondary"
                    : "outline"
              }
              aria-label={
                isAccountingValidated
                  ? "Déclaration validée comptablement"
                  : "Validation comptable en attente"
              }
            >
              {isAccountingValidated
                ? "Validée"
                : isFiscalValidated
                  ? "En attente"
                  : "Bloquée (fiscal requis)"}
            </Badge>
          </div>

          {isAccountingValidated ? (
            <dl className="space-y-2">
              <div>
                <dt className="text-white/50">Validé par</dt>
                <dd>{accountingValidatedByName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-white/50">Le</dt>
                <dd>
                  <time dateTime={accountingValidatedAt ?? ""}>
                    {formatDate(accountingValidatedAt)}
                  </time>
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-white/60">
              {isFiscalValidated
                ? "La validation comptable confirme la conformité financière."
                : "Effectuez la validation fiscale en premier."}
            </p>
          )}

          {canValidateAccounting && (
            <div className="space-y-2">
              {accountingAction.error && (
                <p className="text-sm text-red-400" role="alert">
                  {accountingAction.error}
                </p>
              )}
              <Button
                type="button"
                onClick={() => accountingAction.execute(declarationId)}
                disabled={accountingAction.isPending}
                aria-busy={accountingAction.isPending}
              >
                {accountingAction.isPending
                  ? "Validation en cours…"
                  : "Valider comptablement"}
              </Button>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  )
}
