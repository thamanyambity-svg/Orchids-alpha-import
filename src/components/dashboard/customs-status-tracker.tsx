/**
 * CustomsStatusTracker — Suivi douanier pour l'acheteur
 *
 * Lecture seule. Aucun montant fiscal exposé.
 */

'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { CustomsStatusForBuyer } from '@/app/actions/customs/get-customs-status-for-buyer'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomsStatusTrackerProps {
  data: CustomsStatusForBuyer
}

type StatusVariant = 'default' | 'secondary' | 'destructive' | 'outline'

type StatusConfig = {
  label: string
  description: string
  variant: StatusVariant
  step: number
}

// ─── Données statiques ────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, StatusConfig> = {
  PRE_ADVICE: {
    label: 'Pré-alerte envoyée',
    description:
      'Votre cargaison a été pré-annoncée aux autorités douanières.',
    variant: 'secondary',
    step: 1,
  },
  IN_CUSTOMS: {
    label: 'En cours de dédouanement',
    description: 'Vos marchandises sont en traitement auprès de la DGDA.',
    variant: 'secondary',
    step: 2,
  },
  LIQUIDATED: {
    label: 'Liquidé',
    description: 'Les droits et taxes ont été calculés et liquidés.',
    variant: 'default',
    step: 3,
  },
  PAID: {
    label: 'Taxes réglées',
    description: 'Le paiement des droits de douane a été confirmé.',
    variant: 'default',
    step: 4,
  },
  RELEASED: {
    label: 'Marchandise libérée',
    description:
      'Vos marchandises ont été libérées et sont prêtes pour la livraison.',
    variant: 'default',
    step: 5,
  },
  BLOCKED: {
    label: 'Dossier bloqué',
    description:
      'Un problème a été détecté. Notre équipe prend contact avec vous.',
    variant: 'destructive',
    step: 0,
  },
  DRAFT: {
    label: 'Préparation en cours',
    description: 'Le dossier douanier est en cours de préparation.',
    variant: 'outline',
    step: 0,
  },
}

const TRANSPORT_LABELS: Record<string, string> = {
  AIR: 'Transport aérien',
  SEA: 'Transport maritime',
  LAND: 'Transport terrestre',
}

const TRANSPORT_ICONS: Record<string, string> = {
  AIR: '✈',
  SEA: '🚢',
  LAND: '🚛',
}

const PROGRESS_STEPS = [
  'PRE_ADVICE',
  'IN_CUSTOMS',
  'LIQUIDATED',
  'PAID',
  'RELEASED',
] as const

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

// ─── Sous-composant : barre de progression ────────────────────────────────────

function ProgressBar({ currentStatus }: { currentStatus: string }) {
  const config = STATUS_CONFIG[currentStatus]
  const isBlocked = currentStatus === 'BLOCKED'
  const currentStep = config?.step ?? 0

  if (isBlocked) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <Badge variant="destructive">Dossier bloqué</Badge>
        <p className="mt-2 text-sm text-muted-foreground">
          Notre équipe traite le blocage et vous contactera dans les meilleurs
          délais.
        </p>
      </div>
    )
  }

  return (
    <nav aria-label="Étapes du dédouanement">
      <ol className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:gap-4">
        {PROGRESS_STEPS.map((step, index) => {
          const stepNum = index + 1
          const isDone = currentStep >= stepNum
          const isCurrent = currentStep === stepNum
          const stepConfig = STATUS_CONFIG[step]

          return (
            <li
              key={step}
              className="flex min-w-0 flex-1 items-start gap-2 text-sm"
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div
                className={
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold ' +
                  (isDone
                    ? 'border-primary bg-primary text-primary-foreground'
                    : isCurrent
                      ? 'border-primary text-primary'
                      : 'border-muted-foreground/30 text-muted-foreground')
                }
                aria-hidden="true"
              >
                {isDone ? '✓' : stepNum}
              </div>
              <span className="pt-1 leading-tight">{stepConfig.label}</span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// ─── Sous-composant : jalons de validation ────────────────────────────────────

function ValidationMilestones({
  hasDeclaration,
  isFiscalValidated,
  isAccountingValidated,
}: {
  hasDeclaration: boolean
  isFiscalValidated: boolean
  isAccountingValidated: boolean
}) {
  return (
    <dl className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <dt className="text-muted-foreground">Déclaration enregistrée</dt>
        <dd>
          <Badge variant={hasDeclaration ? 'default' : 'outline'}>
            {hasDeclaration ? '✓ Oui' : 'En attente'}
          </Badge>
        </dd>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <dt className="text-muted-foreground">Vérification fiscale</dt>
        <dd>
          <Badge variant={isFiscalValidated ? 'default' : 'outline'}>
            {isFiscalValidated ? '✓ Effectuée' : 'En attente'}
          </Badge>
        </dd>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <dt className="text-muted-foreground">Validation comptable</dt>
        <dd>
          <Badge variant={isAccountingValidated ? 'default' : 'outline'}>
            {isAccountingValidated ? '✓ Effectuée' : 'En attente'}
          </Badge>
        </dd>
      </div>
    </dl>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function CustomsStatusTracker({ data }: CustomsStatusTrackerProps) {
  const config = STATUS_CONFIG[data.status] ?? {
    label: data.status,
    description: '',
    variant: 'outline' as const,
    step: 0,
  }

  const transportMode = data.transport_mode ?? 'SEA'
  const transportIcon = TRANSPORT_ICONS[transportMode] ?? ''
  const transportLabel = TRANSPORT_LABELS[transportMode] ?? transportMode

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-lg">Procédure douanière</CardTitle>
          <Badge variant={config.variant} aria-label={`Statut : ${config.label}`}>
            {config.label}
          </Badge>
        </div>
        {config.description && (
          <CardDescription>{config.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        <section aria-label="Progression du dédouanement">
          <ProgressBar currentStatus={data.status} />
        </section>

        <Separator />

        <section aria-label="Informations de transport" className="space-y-3">
          <h3 className="text-sm font-semibold">
            {transportIcon} {transportLabel}
          </h3>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {data.transport_ref && (
              <div>
                <dt className="text-muted-foreground">
                  {transportMode === 'AIR'
                    ? 'Numéro LTA'
                    : transportMode === 'SEA'
                      ? 'Numéro B/L'
                      : 'Référence'}
                </dt>
                <dd>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {data.transport_ref}
                  </code>
                </dd>
              </div>
            )}
            {data.vessel_flight_name && (
              <div>
                <dt className="text-muted-foreground">
                  {transportMode === 'AIR' ? 'Numéro de vol' : 'Navire'}
                </dt>
                <dd>{data.vessel_flight_name}</dd>
              </div>
            )}
            {data.container_number && (
              <div>
                <dt className="text-muted-foreground">Conteneur</dt>
                <dd>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {data.container_number}
                  </code>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Dossier ouvert le</dt>
              <dd>
                <time dateTime={data.created_at}>
                  {formatDateShort(data.created_at)}
                </time>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Dernière mise à jour</dt>
              <dd>
                <time dateTime={data.updated_at}>{formatDate(data.updated_at)}</time>
              </dd>
            </div>
          </dl>
        </section>

        <Separator />

        <section aria-label="Étapes de validation administratives" className="space-y-3">
          <h3 className="text-sm font-semibold">Validations administratives</h3>
          <ValidationMilestones
            hasDeclaration={data.has_declaration}
            isFiscalValidated={data.is_fiscal_validated}
            isAccountingValidated={data.is_accounting_validated}
          />
        </section>

        {data.status_history.length > 0 && (
          <>
            <Separator />
            <section
              aria-label="Historique des étapes du dossier douanier"
              className="space-y-3"
            >
              <h3 className="text-sm font-semibold">Historique</h3>
              <ol className="space-y-4 text-sm">
                {data.status_history.map((entry) => {
                  const fromConfig = entry.status_from
                    ? STATUS_CONFIG[entry.status_from]
                    : null
                  const toConfig = STATUS_CONFIG[entry.status_to]

                  return (
                    <li
                      key={entry.id}
                      className="rounded-lg border border-border bg-muted/20 p-3"
                    >
                      <time
                        className="text-xs text-muted-foreground"
                        dateTime={entry.changed_at}
                      >
                        {formatDate(entry.changed_at)}
                      </time>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {fromConfig && (
                          <>
                            <Badge variant={fromConfig.variant}>{fromConfig.label}</Badge>
                            <span aria-hidden="true">→</span>
                          </>
                        )}
                        <Badge variant={toConfig?.variant ?? 'outline'}>
                          {toConfig?.label ?? entry.status_to}
                        </Badge>
                      </div>
                      {entry.reason && entry.status_to !== 'BLOCKED' && (
                        <p className="mt-2 text-muted-foreground">{entry.reason}</p>
                      )}
                      {entry.status_to === 'BLOCKED' && entry.reason && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Notre équipe traite ce point et vous contactera.
                        </p>
                      )}
                    </li>
                  )
                })}
              </ol>
            </section>
          </>
        )}
      </CardContent>
    </Card>
  )
}
