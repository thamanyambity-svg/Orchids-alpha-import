"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { OrderFinancialSummary } from "@/app/actions/client/get-order-financial-summary"

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderAmountDisplayProps {
  /** Données financières chargées par le Server Component parent */
  summary: OrderFinancialSummary
}

// ─── Utilitaires d'affichage ──────────────────────────────────────────────────

/** Formate un montant USD — 2 décimales, séparateurs français */
function formatUSD(amount: number): string {
  return (
    new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + " USD"
  )
}

/**
 * Formate un montant CDF en nombre entier.
 * Le CDF ne s'utilise pas avec des centimes dans les transactions courantes.
 */
function formatCDF(amount: number): string {
  return (
    new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount)) + " CDF"
  )
}

/** Formate le taux — ex : "1 USD = 2 850,50 CDF" */
function formatRate(rate: number): string {
  return (
    "1 USD = " +
    new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(rate) +
    " CDF"
  )
}

/** Formate une date ISO en date française lisible */
function formatRateDate(isoString: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(isoString))
}

// ─── Composant ────────────────────────────────────────────────────────────────

/**
 * OrderAmountDisplay — Affichage multidevise du montant d'une commande
 *
 * Composant Client en LECTURE SEULE.
 * Reçoit OrderFinancialSummary depuis le Server Component parent.
 * Aucun appel Supabase direct.
 * Aucun CSS écrit — composants UI existants uniquement.
 *
 * 3 états couverts selon summary.rateSource :
 *
 * FROZEN      → Taux gelé sur la transaction (immuable)
 * LIVE        → Taux actif en base (pas encore gelé)
 * UNAVAILABLE → Aucun taux configuré
 */
export function OrderAmountDisplay({ summary }: OrderAmountDisplayProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Récapitulatif financier</CardTitle>
        <CardDescription>
          Montant de votre commande et équivalent en Franc Congolais
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* ── Montant principal USD ──────────────────────────────────── */}
        <div>
          <dl>
            <div>
              <dt>Montant dû</dt>
              <dd aria-label={`Montant : ${formatUSD(summary.amountUSD)}`}>
                <strong>{formatUSD(summary.amountUSD)}</strong>
                <Badge variant="outline" aria-label="Dollar Américain">
                  USD
                </Badge>
              </dd>
            </div>
          </dl>
        </div>

        <Separator />

        {/* ── Équivalent CDF (si taux disponible) ───────────────────── */}
        {summary.rateAvailable && summary.amountCDF !== null ? (
          <div>
            <dl>
              <div>
                <dt>Équivalent estimé</dt>
                <dd aria-label={`Équivalent : ${formatCDF(summary.amountCDF)}`}>
                  <strong>{formatCDF(summary.amountCDF)}</strong>
                  <Badge variant="secondary" aria-label="Franc Congolais">
                    CDF
                  </Badge>
                </dd>
              </div>

              {summary.exchangeRate !== null && (
                <div>
                  <dt>Taux appliqué</dt>
                  <dd>{formatRate(summary.exchangeRate)}</dd>
                </div>
              )}

              {summary.rateValidFrom && (
                <div>
                  <dt>Date du taux</dt>
                  <dd>
                    <time dateTime={summary.rateValidFrom}>
                      {formatRateDate(summary.rateValidFrom)}
                    </time>
                  </dd>
                </div>
              )}

              {summary.rateAdminNote && (
                <div>
                  <dt>Référence</dt>
                  <dd>{summary.rateAdminNote}</dd>
                </div>
              )}
            </dl>

            {summary.rateSource === "FROZEN" && (
              <p>
                Ce taux a été fixé au moment de votre transaction et ne changera
                pas.
              </p>
            )}

            {summary.rateSource === "LIVE" && (
              <p>
                Équivalent indicatif basé sur le taux actuel. Le taux sera fixé
                définitivement lors du traitement de votre paiement.
              </p>
            )}
          </div>
        ) : (
          <div aria-live="polite">
            <dl>
              <div>
                <dt>Équivalent CDF</dt>
                <dd aria-label="Équivalent CDF non disponible">
                  Non disponible
                </dd>
              </div>
            </dl>
            <p>
              Le taux de change n&apos;est pas encore configuré. Contactez
              l&apos;administration pour obtenir l&apos;équivalent en Franc
              Congolais.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
