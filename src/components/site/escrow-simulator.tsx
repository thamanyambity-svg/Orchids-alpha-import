"use client"

import { useState } from "react"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n-context"
import { Eyebrow, SectionTitle, SplitBar } from "./sections"

/** Répartition appliquée par la plateforme, alignée sur `purchase_orders`. */
const DEPOSIT_RATE = 0.6
const BALANCE_RATE = 0.4
const COMMISSION_RATE = 0.1

export function EscrowSimulator() {
  const { t, language } = useLanguage()
  const [amount, setAmount] = useState(25000)

  const money = (value: number) =>
    value.toLocaleString(language === "en" ? "en-US" : "fr-FR", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    })

  const commission = amount * COMMISSION_RATE
  const rows = [
    { label: t("site.sim.deposit", "Acompte 60 %"), value: money(amount * DEPOSIT_RATE), color: "var(--gold)" },
    { label: t("site.sim.balance", "Solde 40 %"), value: money(amount * BALANCE_RATE), color: "#fff" },
    { label: t("site.sim.commission", "Commission Alpha 10 %"), value: money(commission), color: "rgba(255,255,255,.62)" },
    { label: t("site.sim.payout", "Reversé au partenaire"), value: money(amount - commission), color: "rgba(255,255,255,.62)" },
  ]

  return (
    <section className="border-t border-[var(--line)] bg-[var(--navy2)] py-[116px]">
      <div className="mx-auto max-w-[1440px] px-8">
        <div data-reveal className="mb-12 max-w-[720px]">
          <Eyebrow rule={false}>{t("site.sim.eyebrow", "Simulateur")}</Eyebrow>
          <SectionTitle size="md">{t("site.sim.title", "")}</SectionTitle>
          <p className="mt-[22px] text-[18px] font-light leading-[1.6] text-white/55 [text-wrap:pretty]">
            {t("site.sim.body", "")}
          </p>
        </div>

        <div className="grid gap-px border border-[var(--line)] bg-[var(--line)] [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
          <div className="flex flex-col justify-center gap-[30px] bg-[var(--navy)] px-[34px] py-11">
            <div>
              <div className="mb-4 flex items-baseline justify-between gap-[14px]">
                <label
                  htmlFor="sim-amount"
                  className="font-condensed text-[11px] font-bold uppercase tracking-[.32em] text-white/45"
                >
                  {t("site.sim.amount", "Montant de la commande")}
                </label>
                <span className="font-display text-[38px] leading-[.9] text-gold [font-variant-numeric:tabular-nums]">
                  {money(amount)}
                </span>
              </div>
              <input
                id="sim-amount"
                type="range"
                min={1000}
                max={250000}
                step={500}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="h-[2px] w-full accent-[var(--gold)]"
              />
            </div>

            <div className="flex flex-col gap-px bg-[var(--line)]">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-4 bg-[hsl(216_45%_6%/.6)] px-[18px] py-4"
                >
                  <span className="font-condensed text-[13px] font-semibold uppercase tracking-[.18em] text-white/55">
                    {row.label}
                  </span>
                  <span
                    className="font-display text-[26px] leading-none whitespace-nowrap [font-variant-numeric:tabular-nums]"
                    style={{ color: row.color }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-center gap-[26px] bg-[hsl(216_45%_6%)] px-[34px] py-11">
            <SplitBar height={96} compact />
            <p className="m-0 text-[15px] font-light leading-[1.62] text-white/45 [text-wrap:pretty]">
              {t("site.sim.note", "")}
            </p>
            <Link
              href="/contact"
              className="self-start bg-gold px-[34px] py-[18px] font-condensed text-[12px] font-bold uppercase tracking-[.28em] text-[#0a1018] whitespace-nowrap"
            >
              {t("site.cta.platform", "Accéder à la plateforme")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
