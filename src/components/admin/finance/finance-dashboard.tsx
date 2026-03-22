'use client'

import { useState, useCallback, useTransition } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PeriodFilter, PeriodPreset } from '@/lib/finance/period-range'
import {
  getFinanceDashboardData,
  type FinanceDashboardData,
} from '@/app/actions/finance/get-dashboard-data'

interface FinanceDashboardProps {
  initialData: FinanceDashboardData | null
}

const PRESET_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: '7d', label: '7 derniers jours' },
  { value: '30d', label: '30 derniers jours' },
  { value: 'this_month', label: 'Ce mois-ci' },
  { value: 'last_month', label: 'Mois précédent' },
  { value: 'this_quarter', label: 'Ce trimestre' },
  { value: 'this_year', label: 'Cette année' },
  { value: 'custom', label: 'Plage personnalisée' },
]

const DOSSIER_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  PRE_ADVICE: 'Pré-alerte',
  IN_CUSTOMS: 'En douane',
  LIQUIDATED: 'Liquidé',
  PAID: 'Réglé',
  RELEASED: 'Libéré',
  BLOCKED: 'Bloqué',
}

const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyée',
  PAID: 'Réglée',
  CANCELLED: 'Annulée',
}

function fmtUSD(n: number): string {
  return (
    new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n) + ' USD'
  )
}

function fmtCDF(n: number): string {
  return (
    new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n) + ' CDF'
  )
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso))
}

function pct(part: number, total: number): string {
  if (total === 0) return '0 %'
  return Math.round((part / total) * 100) + ' %'
}

function deboursWidthPercent(data: FinanceDashboardData): number {
  if (data.total_facture_usd <= 0) return 0
  return Math.min(100, Math.round((data.total_debours_usd / data.total_facture_usd) * 100))
}

function honorairesWidthPercent(data: FinanceDashboardData): number {
  if (data.total_facture_usd <= 0) return 0
  return Math.min(100, Math.round((data.total_honoraires_usd / data.total_facture_usd) * 100))
}

function exportToCSV(data: FinanceDashboardData) {
  const headers = [
    'N° Facture',
    'Statut',
    'Client',
    'Date émission',
    'Échéance',
    'Débours (USD)',
    'Honoraires (USD)',
    'Total (USD)',
    'Total local',
    'Devise',
    'ID Dossier',
  ]

  const rows = data.invoices.map((inv) => [
    inv.invoice_number,
    INVOICE_STATUS_LABELS[inv.status] ?? inv.status,
    inv.buyer_name ?? '—',
    fmtDate(inv.issued_at),
    fmtDate(inv.due_date),
    inv.subtotal_disbursements_usd.toFixed(2),
    inv.subtotal_fees_usd.toFixed(2),
    inv.total_usd.toFixed(2),
    inv.total_local?.toFixed(2) ?? '',
    inv.currency_local,
    inv.customs_file_id,
  ])

  rows.push([])
  rows.push([
    'TOTAL FACTURÉ',
    '',
    '',
    '',
    '',
    data.total_debours_usd.toFixed(2),
    data.total_honoraires_usd.toFixed(2),
    data.total_facture_usd.toFixed(2),
    data.total_facture_cdf?.toFixed(0) ?? '',
    'CDF',
    '',
  ])
  rows.push([
    'TOTAL ENCAISSÉ (PAID)',
    '',
    '',
    '',
    '',
    '',
    '',
    data.total_encaisse_usd.toFixed(2),
    '',
    '',
    '',
  ])
  rows.push([
    'EN ATTENTE (SENT)',
    '',
    '',
    '',
    '',
    '',
    '',
    data.total_en_attente_usd.toFixed(2),
    '',
    '',
    '',
  ])

  const csvContent = [
    `Période : ${fmtDate(data.date_from)} → ${fmtDate(data.date_to)}`,
    `Exporté le : ${fmtDate(new Date().toISOString())}`,
    '',
    headers.join(';'),
    ...rows.map((r) => r.join(';')),
  ].join('\n')

  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `finance-alpha-import-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export function FinanceDashboard({ initialData }: FinanceDashboardProps) {
  const [data, setData] = useState<FinanceDashboardData | null>(initialData)
  const [preset, setPreset] = useState<PeriodPreset>('30d')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const loadData = useCallback((f: PeriodFilter) => {
    setFetchError(null)
    startTransition(() => {
      void (async () => {
        const result = await getFinanceDashboardData(f)
        if (result.success) {
          setData(result.data)
        } else {
          setFetchError(result.error)
        }
      })()
    })
  }, [])

  const handlePresetChange = useCallback(
    (value: string) => {
      const p = value as PeriodPreset
      setPreset(p)
      if (p !== 'custom') {
        loadData({ preset: p })
      }
    },
    [loadData]
  )

  const handleCustomApply = useCallback(() => {
    if (!dateFrom || !dateTo) return
    loadData({
      preset: 'custom',
      dateFrom: new Date(dateFrom + 'T00:00:00').toISOString(),
      dateTo: new Date(dateTo + 'T23:59:59.999').toISOString(),
    })
  }, [dateFrom, dateTo, loadData])

  const periodLabel = data ? `${fmtDate(data.date_from)} → ${fmtDate(data.date_to)}` : ''

  const totalInvoices = data?.invoices.length ?? 0
  const paidCount = data?.invoices.filter((i) => i.status === 'PAID').length ?? 0
  const sentCount = data?.invoices.filter((i) => i.status === 'SENT').length ?? 0

  const wDeb = data ? deboursWidthPercent(data) : 0
  const wHon = data ? honorairesWidthPercent(data) : 0

  return (
    <div className="space-y-6 text-white/90">
      <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
        <div className="space-y-2 min-w-[200px]">
          <Label htmlFor="period-select" className="text-white/70">
            Période
          </Label>
          <Select value={preset} onValueChange={handlePresetChange}>
            <SelectTrigger
              id="period-select"
              aria-label="Sélectionner la période"
              className="border-white/20 bg-white/5 text-white"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESET_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {preset === 'custom' && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="date-from" className="text-white/70">
                Du
              </Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                max={dateTo || undefined}
                className="border-white/20 bg-white/5 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to" className="text-white/70">
                Au
              </Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                min={dateFrom || undefined}
                className="border-white/20 bg-white/5 text-white"
              />
            </div>
            <Button
              type="button"
              onClick={handleCustomApply}
              disabled={!dateFrom || !dateTo || isPending}
            >
              Appliquer
            </Button>
          </div>
        )}

        {data && data.invoices.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10 md:ml-auto"
            onClick={() => exportToCSV(data)}
            aria-label="Exporter les données en CSV pour Excel"
          >
            Exporter CSV
          </Button>
        ) : null}
      </div>

      {isPending ? (
        <p className="text-sm text-white/60" role="status" aria-live="polite">
          Chargement des données…
        </p>
      ) : null}

      {fetchError ? (
        <p className="text-sm text-destructive" role="alert" aria-live="assertive">
          {fetchError}
        </p>
      ) : null}

      {data && !isPending ? (
        <>
          <p className="text-sm text-white/70" aria-live="polite">
            Données pour la période : <strong className="text-white">{periodLabel}</strong>
            {data.exchange_rate != null ? (
              <>
                {' '}
                — Taux : 1 USD = {data.exchange_rate.toLocaleString('fr-FR')} CDF
              </>
            ) : null}
          </p>

          <Separator className="bg-white/10" />

          <div
            className="grid gap-4 md:grid-cols-3"
            role="list"
            aria-label="Indicateurs financiers clés"
          >
            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader>
                <CardTitle className="text-lg">Total facturé</CardTitle>
                <CardDescription className="text-white/50">
                  {totalInvoices} facture{totalInvoices !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold text-[#ffd700]">{fmtUSD(data.total_facture_usd)}</p>
                {data.total_facture_cdf != null ? (
                  <p className="mt-1 text-sm text-white/70">{fmtCDF(data.total_facture_cdf)}</p>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader>
                <CardTitle className="text-lg">Total encaissé</CardTitle>
                <CardDescription className="text-white/50">
                  {paidCount} facture{paidCount !== 1 ? 's' : ''} réglée{paidCount !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">{fmtUSD(data.total_encaisse_usd)}</p>
                <p className="mt-1 text-sm text-white/60">
                  {pct(data.total_encaisse_usd, data.total_facture_usd)} du total facturé
                </p>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader>
                <CardTitle className="text-lg">En attente de paiement</CardTitle>
                <CardDescription className="text-white/50">
                  {sentCount} facture{sentCount !== 1 ? 's' : ''} envoyée{sentCount !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">{fmtUSD(data.total_en_attente_usd)}</p>
                <p className="mt-1 text-sm text-white/60">
                  {pct(data.total_en_attente_usd, data.total_facture_usd)} du total facturé
                </p>
              </CardContent>
            </Card>
          </div>

          <Separator className="bg-white/10" />

          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader>
              <CardTitle>Répartition Débours / Honoraires</CardTitle>
              <CardDescription className="text-white/50">
                Sur {totalInvoices} facture{totalInvoices !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-white/60">Débours (taxes douanières)</dt>
                  <dd className="font-medium">
                    {fmtUSD(data.total_debours_usd)}
                    <span className="ml-2 text-sm text-white/50">
                      — {pct(data.total_debours_usd, data.total_facture_usd)}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-white/60">Honoraires Alpha Import</dt>
                  <dd className="font-medium">
                    {fmtUSD(data.total_honoraires_usd)}
                    <span className="ml-2 text-sm text-white/50">
                      — {pct(data.total_honoraires_usd, data.total_facture_usd)}
                    </span>
                  </dd>
                </div>
              </dl>

              {data.total_facture_usd > 0 ? (
                <div
                  className="flex h-3 w-full max-w-md overflow-hidden rounded-full bg-white/10"
                  role="img"
                  aria-label={`Débours ${wDeb} %, Honoraires ${wHon} %`}
                >
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${wDeb}%` }}
                    aria-hidden
                  />
                  <div
                    className="h-full bg-chart-2"
                    style={{ width: `${wHon}%` }}
                    aria-hidden
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Separator className="bg-white/10" />

          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader>
              <CardTitle>Dossiers douaniers par statut</CardTitle>
              <CardDescription className="text-white/50">
                Tous les dossiers — pas filtré par période
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                {data.dossiers_par_statut.map((entry) => (
                  <div key={entry.status} className="flex flex-wrap items-center gap-2 justify-between">
                    <dt>
                      <Badge variant="outline" className="border-white/30 text-white">
                        {DOSSIER_STATUS_LABELS[entry.status] ?? entry.status}
                      </Badge>
                    </dt>
                    <dd className="text-sm text-white/80">
                      {entry.count} dossier{entry.count !== 1 ? 's' : ''}
                    </dd>
                  </div>
                ))}
                {data.dossiers_par_statut.length === 0 ? (
                  <p className="text-sm text-white/50" role="note">
                    Aucun dossier.
                  </p>
                ) : null}
              </dl>
            </CardContent>
          </Card>

          <Separator className="bg-white/10" />

          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader>
              <CardTitle>Détail des factures</CardTitle>
              <CardDescription className="text-white/50">
                {totalInvoices} facture{totalInvoices !== 1 ? 's' : ''} sur la période
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.invoices.length === 0 ? (
                <p className="text-sm text-white/50" role="note">
                  Aucune facture sur cette période.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-white/60">
                        <th className="pb-2 pr-4 font-medium">N° Facture</th>
                        <th className="pb-2 pr-4 font-medium">Client</th>
                        <th className="pb-2 pr-4 font-medium">Émise le</th>
                        <th className="pb-2 pr-4 font-medium">Statut</th>
                        <th className="pb-2 font-medium">Total USD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.invoices.map((inv) => (
                        <tr key={inv.id} className="border-b border-white/5">
                          <td className="py-2 pr-4">
                            <code className="text-xs text-[#ffd700]">{inv.invoice_number}</code>
                          </td>
                          <td className="py-2 pr-4">{inv.buyer_name ?? '—'}</td>
                          <td className="py-2 pr-4">
                            <time dateTime={inv.issued_at}>{fmtDate(inv.issued_at)}</time>
                          </td>
                          <td className="py-2 pr-4">
                            <Badge
                              variant={
                                inv.status === 'PAID'
                                  ? 'default'
                                  : inv.status === 'SENT'
                                    ? 'secondary'
                                    : 'outline'
                              }
                            >
                              {INVOICE_STATUS_LABELS[inv.status] ?? inv.status}
                            </Badge>
                          </td>
                          <td className="py-2 font-medium">{fmtUSD(inv.total_usd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      {!data && !isPending && !fetchError ? (
        <p className="text-sm text-white/50" role="note">
          Sélectionnez une période pour afficher les données.
        </p>
      ) : null}
    </div>
  )
}
