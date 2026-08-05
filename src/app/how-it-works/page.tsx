"use client"

import { useLanguage } from "@/lib/i18n-context"
import { SiteShell } from "@/components/site/site-shell"
import { useReveal } from "@/components/site/use-reveal"
import { PageHero, SectionTitle, STEP_KEYS } from "@/components/site/sections"

/**
 * Les neuf états réels d'une commande, repris de ORDER_TRANSITIONS dans
 * src/lib/workflow.ts. Ce tableau doit rester aligné sur le code : c'est ce que
 * l'acheteur verra effectivement dans son espace, promettre autre chose serait
 * un mensonge commercial.
 */
const ORDER_STATES: [string, string, string][] = [
  ["PENDING", "Devis émis, en attente d'acceptation", "Acheteur"],
  ["AWAITING_DEPOSIT", "Acompte 60 % appelé", "Acheteur"],
  ["FUNDED", "Acompte reçu et séquestré", "Système / Admin"],
  ["SOURCING", "Feu vert donné au partenaire", "Admin"],
  ["PURCHASED", "Achat confirmé avec preuve", "Partenaire"],
  ["SHIPPED", "Expédié, tracking communiqué", "Partenaire"],
  ["DELIVERED", "Réception conforme constatée", "Partenaire / Admin"],
  ["AWAITING_BALANCE", "Solde 40 % appelé", "Système"],
  ["CLOSED", "Solde libéré, dossier clos", "Admin"],
]

const CELL = "border-b border-[hsl(216_30%_18%/.5)] px-[18px] py-[15px] font-condensed text-[15px] tracking-[.05em]"

export default function ProcessPage() {
  const { t } = useLanguage()
  useReveal()

  return (
    <SiteShell>
      <PageHero
        eyebrow={t("site.how.eyebrow", "Comment ça marche")}
        title={t("site.how.pageTitle", "LE PROCESSUS")}
        body={t("site.how.pageBody", "")}
        image="photo-1578575437130-527eed3abbec"
      />

      <section className="border-t border-[var(--line)] bg-[var(--navy2)] py-[100px]">
        <div className="mx-auto max-w-[1100px] px-8">
          {STEP_KEYS.map((key, i) => (
            <div
              key={key}
              data-reveal
              className="grid gap-8 border-b border-[var(--line)] py-[42px] [grid-template-columns:110px_1fr] max-sm:[grid-template-columns:1fr]"
            >
              <div>
                <span className="block font-display text-[72px] leading-[.8] text-[hsl(42_85%_55%/.3)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="mt-[10px] block font-condensed text-[11px] font-semibold uppercase tracking-[.24em] text-gold">
                  {t(`${key}.tag`, "")}
                </span>
              </div>
              <div>
                <h3 className="mb-[14px] mt-0 font-display text-[clamp(28px,3.4vw,44px)] leading-none text-white">
                  {t(`${key}.title`, "")}
                </h3>
                <p className="m-0 text-[18px] font-light leading-[1.65] text-white/60 [text-wrap:pretty]">
                  {t(`${key}.long`, "")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-[var(--line)] bg-[var(--navy)] py-[100px]">
        <div className="mx-auto max-w-[1440px] px-8">
          <div data-reveal className="mb-[18px]">
            <SectionTitle size="sm">{t("site.states.title", "")}</SectionTitle>
          </div>
          <p
            data-reveal
            className="mb-11 max-w-[680px] text-[18px] font-light leading-[1.62] text-white/55 [text-wrap:pretty]"
          >
            {t("site.states.body", "")}
          </p>

          <div className="overflow-x-auto border border-[var(--line)]">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr>
                  {[
                    "#",
                    t("site.states.h1", "État"),
                    t("site.states.h2", "Ce qui se passe"),
                    t("site.states.h3", "Qui agit"),
                  ].map((head, i) => (
                    <th
                      key={head}
                      scope="col"
                      className={`border-b border-[var(--line)] bg-[var(--navy2)] px-[18px] py-4 text-left font-condensed text-[11px] font-bold uppercase tracking-[.28em] text-gold ${
                        i === 0 ? "w-14" : ""
                      }`}
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ORDER_STATES.map(([state, what, who], row) => (
                  <tr key={state} className={row % 2 ? "bg-[hsl(216_40%_9%/.45)]" : undefined}>
                    <td className={`${CELL} text-[hsl(42_85%_55%/.7)]`}>{String(row + 1).padStart(2, "0")}</td>
                    <td className={`${CELL} text-white`}>{state}</td>
                    <td className={`${CELL} text-white/60`}>{what}</td>
                    <td className={`${CELL} text-white/50`}>{who}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </SiteShell>
  )
}
