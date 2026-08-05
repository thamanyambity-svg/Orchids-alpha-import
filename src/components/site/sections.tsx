"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n-context"
import { useCountUp } from "./use-reveal"
import { NetworkMap } from "./network-map"

const IMG = (id: string) =>
  `url('https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=70')`

/* ── Blocs réutilisables ─────────────────────────────────────────────────── */

export function Eyebrow({ children, rule = true }: { children: React.ReactNode; rule?: boolean }) {
  return (
    <div className="mb-[22px] flex items-center gap-4">
      {rule && <span className="block h-px w-14 bg-gold" />}
      <span className="font-condensed text-[12px] font-semibold uppercase tracking-[.5em] text-gold">
        {children}
      </span>
    </div>
  )
}

export function SectionTitle({
  children,
  size = "lg",
}: {
  children: React.ReactNode
  size?: "lg" | "md" | "sm"
}) {
  const clamp =
    size === "lg"
      ? "text-[clamp(46px,7vw,110px)]"
      : size === "md"
        ? "text-[clamp(38px,5.4vw,84px)]"
        : "text-[clamp(32px,4.2vw,60px)]"
  return <h2 className={`m-0 font-display ${clamp} leading-[.88] text-white`}>{children}</h2>
}

/** Titre de page interne : même gabarit sur les six pages secondaires. */
export function PageHero({
  eyebrow,
  title,
  body,
  image,
}: {
  eyebrow: string
  title: string
  body: string
  image?: string
}) {
  return (
    <section className="relative overflow-hidden bg-[var(--navy)] pb-[100px] pt-[216px]">
      {image ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center opacity-[.22]"
            style={{ backgroundImage: IMG(image) }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(216_45%_6%/.8),hsl(216_45%_6%/.98))]" />
        </>
      ) : (
        <div className="absolute inset-0 opacity-60 [background:repeating-linear-gradient(115deg,transparent_0_30px,hsl(42_85%_55%/.04)_30px_31px)]" />
      )}
      <div className="relative mx-auto max-w-[1440px] px-8">
        <span className="mb-5 block font-condensed text-[12px] font-semibold uppercase tracking-[.5em] text-gold">
          {eyebrow}
        </span>
        <h1 className="m-0 font-display text-[clamp(50px,9.6vw,164px)] leading-[.86] text-white">{title}</h1>
        <p className="mt-7 max-w-[700px] text-[20px] font-light leading-[1.55] text-white/60 [text-wrap:pretty]">
          {body}
        </p>
      </div>
    </section>
  )
}

/* ── Accueil : hero ──────────────────────────────────────────────────────── */

const HERO = [
  { word: "L'AFRIQUE", sub: "CONNECTÉE AU MONDE", tag: "KINSHASA · RDC", img: "photo-1494412574643-ff11b0a5c1c3" },
  { word: "VITESSE", sub: "SANS COMPROMIS", tag: "SHANGHAI · DUBAI · TOKYO", img: "photo-1578575437130-527eed3abbec" },
  { word: "SÉCURITÉ", sub: "CERTIFIÉE ISO 9001", tag: "47 PAYS PARTENAIRES", img: "photo-1613690399151-65ea69478674" },
  { word: "CONFIANCE", sub: "VOTRE PARTENAIRE GLOBAL", tag: "BRUXELLES · NEW YORK · GUANGZHOU", img: "photo-1553413077-190dd305871c" },
]

export function Hero() {
  const { t } = useLanguage()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % HERO.length), 5600)
    return () => clearInterval(timer)
  }, [])

  const slide = HERO[index]

  return (
    <section className="relative h-screen min-h-[660px] overflow-hidden bg-[var(--navy)]">
      <div className="absolute inset-0 overflow-hidden">
        {HERO.map((s, i) => (
          <div
            key={s.word}
            className="absolute -inset-[6%] bg-cover bg-center transition-opacity duration-[1300ms]"
            style={{
              backgroundImage: IMG(s.img),
              opacity: i === index ? 1 : 0,
              animation: "heroPan 14s linear infinite alternate",
            }}
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(216_45%_6%/.74)_0%,hsl(216_45%_6%/.5)_45%,hsl(216_45%_6%/.96)_100%)]" />
      <div className="absolute inset-0 opacity-50 [background:repeating-linear-gradient(115deg,transparent_0_26px,hsl(42_85%_55%/.05)_26px_27px)]" />

      <div className="relative mx-auto flex h-full max-w-[1440px] flex-col justify-end px-8 pb-[8vh]">
        <div className="mb-[34px] flex items-center gap-4">
          <span className="block h-px w-14 shrink-0 bg-gold" />
          <span className="font-condensed text-[11px] font-semibold uppercase tracking-[.26em] text-gold">
            {slide.tag}
          </span>
        </div>

        <h1 className="m-0 font-display text-[clamp(56px,12.5vw,206px)] leading-[.84] tracking-[-.012em] text-white">
          <span key={slide.word} className="block overflow-hidden pb-[.04em]">
            {slide.word.split("").map((ch, i) => (
              <span
                key={`${slide.word}-${i}`}
                className="inline-block"
                style={{ animation: `rise .82s cubic-bezier(.16,1,.3,1) ${i * 0.045}s both` }}
              >
                {ch === " " ? " " : ch}
              </span>
            ))}
          </span>
          <span className="mt-[.24em] block text-[.4em] tracking-[.02em] text-gold">{slide.sub}</span>
        </h1>

        <p className="mt-7 max-w-[640px] text-[20px] font-light leading-[1.55] text-white/65 [text-wrap:pretty]">
          {t("site.hero.body", "")}
        </p>

        <div className="mt-[38px] flex flex-wrap gap-[14px]">
          <Link
            href="/contact"
            className="bg-gold px-[38px] py-5 font-condensed text-[13px] font-bold uppercase tracking-[.28em] text-[#0a1018] transition-transform duration-300 hover:-translate-y-[3px]"
          >
            {t("site.cta.platform", "Accéder à la plateforme")}
          </Link>
          <Link
            href="/how-it-works"
            className="border border-[var(--line)] px-[38px] py-5 font-condensed text-[13px] font-bold uppercase tracking-[.28em] text-white/80 transition-colors duration-300 hover:border-gold hover:text-gold"
          >
            {t("site.cta.discover", "Découvrir")}
          </Link>
        </div>

        <div className="mt-11 flex items-center gap-[10px]">
          {HERO.map((s, i) => (
            <button
              key={s.word}
              onClick={() => setIndex(i)}
              aria-label={s.word}
              className="h-[2px] border-none p-0 transition-[width,background] duration-500"
              style={{
                width: i === index ? 44 : 18,
                background: i === index ? "var(--gold)" : "rgba(255,255,255,.24)",
              }}
            />
          ))}
          <span className="ml-[14px] font-condensed text-[11px] tracking-[.36em] text-white/35">
            {String(index + 1).padStart(2, "0")} / {String(HERO.length).padStart(2, "0")}
          </span>
        </div>
      </div>

      <div
        className="absolute bottom-[8vh] right-8 hidden flex-col items-center gap-3 md:flex"
        style={{ animation: "drift 3s ease-in-out infinite" }}
      >
        <span className="font-condensed text-[10px] tracking-[.4em] text-white/30 [writing-mode:vertical-rl]">
          {t("site.scroll", "Scroll")}
        </span>
        <span className="block h-14 w-px bg-[linear-gradient(180deg,var(--gold),transparent)]" />
      </div>
    </section>
  )
}

/* ── Bandeau de confiance ────────────────────────────────────────────────── */

export function TrustMarquee() {
  const { t, language } = useLanguage()
  const items =
    language === "en"
      ? ["60/40 escrow", "SGS certification", "ISO 9001", "Pre-shipment inspection", "Kinshasa clearance", "KYC verification", "Audit log", "Cargo insurance", "47 countries"]
      : ["Séquestre 60/40", "Certification SGS", "ISO 9001", "Contrôle avant expédition", "Dédouanement Kinshasa", "Vérification KYC", "Journal d'audit", "Assurance cargo", "47 pays"]

  return (
    <section className="relative overflow-hidden border-y border-[var(--line)] bg-[var(--navy2)] pt-14">
      <div className="mx-auto max-w-[1440px] px-8 pb-[46px] text-center">
        <h2 className="m-0 font-display text-[clamp(28px,3.4vw,48px)] leading-none text-white">
          {t("site.trust.title", "")}
        </h2>
        <p className="mx-auto mt-4 max-w-[560px] text-[17px] font-light leading-[1.6] text-white/50">
          {t("site.trust.sub", "")}
        </p>
      </div>
      <div className="overflow-hidden border-t border-[var(--line)] py-5">
        <div className="flex w-[200%] animate-marquee">
          {[...items, ...items].map((label, i) => (
            <span
              key={`${label}-${i}`}
              className="flex shrink-0 items-center gap-11 pr-11 font-condensed text-[14px] font-semibold uppercase tracking-[.34em] text-white/45 whitespace-nowrap"
            >
              {label}
              <span className="block h-[5px] w-[5px] bg-gold" />
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Le 60/40 ────────────────────────────────────────────────────────────── */

/** Barre de répartition acompte / solde, réutilisée par le simulateur. */
export function SplitBar({ height = 74, compact = false }: { height?: number; compact?: boolean }) {
  const { t } = useLanguage()
  const figure = compact ? "text-[30px]" : "text-[34px]"
  const caption = compact ? "text-[10px]" : "text-[11px]"

  return (
    <div className="relative flex items-stretch overflow-hidden" style={{ height }}>
      <div className="relative flex shrink-0 grow-0 basis-[60%] flex-col justify-center overflow-hidden bg-gold px-[22px]">
        <span
          className="absolute bottom-0 left-0 top-0 w-[28%] bg-[linear-gradient(90deg,transparent,hsl(42_90%_78%/.55),transparent)]"
          style={{ animation: "flow 3.4s linear infinite" }}
        />
        <span className={`relative font-display ${figure} leading-[.9] text-[#0a1018]`}>60 %</span>
        <span
          className={`relative font-condensed ${caption} font-bold uppercase tracking-[.24em] text-[hsl(216_45%_6%/.7)]`}
        >
          {t("site.escrow.deposit", "Acompte à la commande")}
        </span>
      </div>
      <div className="flex shrink-0 grow-0 basis-[40%] flex-col justify-center border border-l-0 border-gold bg-[hsl(216_45%_6%)] px-[22px]">
        <span className={`font-display ${figure} leading-[.9] text-gold`}>40 %</span>
        <span className={`font-condensed ${caption} font-bold uppercase tracking-[.24em] text-white/50`}>
          {t("site.escrow.balance", "Solde à réception conforme")}
        </span>
      </div>
    </div>
  )
}

export function EscrowSection() {
  const { t } = useLanguage()
  const points = [
    { num: "01", title: t("site.escrow.p1.title", ""), body: t("site.escrow.p1.body", "") },
    { num: "02", title: t("site.escrow.p2.title", ""), body: t("site.escrow.p2.body", "") },
    { num: "03", title: t("site.escrow.p3.title", ""), body: t("site.escrow.p3.body", "") },
  ]

  return (
    <section className="relative overflow-hidden bg-[var(--navy)] py-[130px]">
      <div className="mx-auto max-w-[1440px] px-8">
        <div data-reveal className="mb-16 max-w-[820px]">
          <Eyebrow>{t("site.escrow.eyebrow", "")}</Eyebrow>
          <h2 className="m-0 font-display text-[clamp(46px,7.4vw,116px)] leading-[.88] text-white">
            {t("site.escrow.title", "")}
          </h2>
          <div
            className="mt-7 h-4 w-[120px] origin-left bg-gold"
            style={{ animation: "barIn .9s .2s cubic-bezier(.16,1,.3,1) both" }}
          />
          <p className="mt-7 text-[19px] font-light leading-[1.62] text-white/60 [text-wrap:pretty]">
            {t("site.escrow.body", "")}
          </p>
        </div>

        <div data-reveal className="mb-px border border-[var(--line)] bg-[var(--navy2)] px-8 pb-[34px] pt-[38px]">
          <SplitBar />
        </div>

        <div className="grid gap-px bg-[var(--line)] [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {points.map((p) => (
            <div
              key={p.num}
              data-reveal
              className="border-t-2 border-transparent bg-[var(--navy2)] px-7 pb-10 pt-9 transition-colors duration-[400ms] hover:border-gold"
            >
              <span className="mb-[18px] block font-display text-[48px] leading-[.8] text-[hsl(42_85%_55%/.26)]">
                {p.num}
              </span>
              <h3 className="mb-3 mt-0 font-display text-[27px] leading-[1.05] text-white">{p.title}</h3>
              <p className="m-0 text-[16px] font-light leading-[1.62] text-white/55 [text-wrap:pretty]">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Services ────────────────────────────────────────────────────────────── */

export const SERVICES = [
  { num: "01", key: "sourcing", img: "photo-1494412574643-ff11b0a5c1c3", bg: "var(--navy)", flip: false },
  { num: "02", key: "logistics", img: "photo-1578575437130-527eed3abbec", bg: "var(--navy2)", flip: true },
  { num: "03", key: "finance", img: "photo-1551288049-bebda4e38f71", bg: "var(--navy)", flip: false },
  { num: "04", key: "quality", img: "photo-1504328345606-18bbc8c9d7d1", bg: "var(--navy2)", flip: true },
  { num: "05", key: "trade", img: "photo-1620714223084-8fcacc6dfd8d", bg: "var(--navy)", flip: false },
  { num: "06", key: "consulting", img: "photo-1553413077-190dd305871c", bg: "var(--navy2)", flip: true },
] as const

export function ServicesGrid() {
  const { t } = useLanguage()

  return (
    <section className="relative border-t border-[var(--line)] bg-[var(--navy2)] py-[130px]">
      <div className="mx-auto max-w-[1440px] px-8">
        <div data-reveal className="mb-[66px] max-w-[760px]">
          <Eyebrow>{t("site.svc.eyebrow", "")}</Eyebrow>
          <SectionTitle>{t("site.svc.title", "")}</SectionTitle>
        </div>
        <div className="grid gap-px bg-[var(--line)] [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
          {SERVICES.map((s) => (
            <Link
              key={s.num}
              href="/services"
              data-reveal
              className="group relative flex min-h-[440px] flex-col justify-end overflow-hidden bg-[var(--navy2)] transition-colors duration-[450ms] hover:bg-[hsl(216_40%_12%)]"
            >
              <div
                className="absolute inset-0 bg-cover bg-center opacity-[.26] transition-[opacity,transform] duration-700 group-hover:scale-[1.08] group-hover:opacity-[.48]"
                style={{ backgroundImage: IMG(s.img) }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(216_40%_9%/.32)_0%,hsl(216_40%_9%/.84)_55%,hsl(216_40%_9%/.97)_100%)]" />
              <div className="absolute left-0 right-0 top-0 h-[3px] origin-left scale-x-0 bg-gold transition-transform duration-500 group-hover:scale-x-100" />
              <div className="relative px-[30px] pb-[38px] pt-[34px]">
                <span className="mb-3 block font-display text-[48px] leading-none text-[hsl(42_85%_55%/.3)]">
                  {s.num}
                </span>
                <h3 className="mb-[14px] mt-0 font-display text-[30px] leading-[1.04] text-white">
                  {t(`site.svc.${s.key}.title`, "")}
                </h3>
                <p className="m-0 text-[16px] font-light leading-[1.62] text-white/60 [text-wrap:pretty]">
                  {t(`site.svc.${s.key}.body`, "")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Réseau ──────────────────────────────────────────────────────────────── */

export function NetworkSection() {
  const { t } = useLanguage()

  return (
    <section className="relative overflow-hidden border-t border-[var(--line)] bg-[var(--navy)] py-[130px]">
      <div className="absolute inset-0 opacity-60 [background:repeating-linear-gradient(115deg,transparent_0_30px,hsl(42_85%_55%/.035)_30px_31px)]" />
      <div className="relative mx-auto max-w-[1440px] px-8">
        <div data-reveal className="mb-14 flex flex-wrap items-end justify-between gap-[34px]">
          <div className="max-w-[660px]">
            <Eyebrow>{t("site.net.eyebrow", "")}</Eyebrow>
            <SectionTitle>{t("site.net.title", "")}</SectionTitle>
          </div>
          <p className="m-0 max-w-[390px] text-[18px] font-light leading-[1.6] text-white/55 [text-wrap:pretty]">
            {t("site.net.body", "")}
          </p>
        </div>
        <div
          data-reveal
          className="relative border border-[var(--line)] bg-[hsl(216_40%_9%/.6)]"
          style={{ height: "clamp(380px, 52vw, 660px)" }}
        >
          <NetworkMap />
          <div className="absolute bottom-[18px] left-5 flex flex-wrap gap-[22px]">
            <span className="flex items-center gap-[9px] font-condensed text-[11px] uppercase tracking-[.3em] text-white/40">
              <span className="block h-[7px] w-[7px] rounded-full bg-gold" />
              {t("site.net.legendHub", "Hub Kinshasa")}
            </span>
            <span className="flex items-center gap-[9px] font-condensed text-[11px] uppercase tracking-[.3em] text-white/40">
              <span className="block h-px w-[22px] bg-[hsl(42_85%_55%/.6)]" />
              {t("site.net.legendRoute", "Corridor actif")}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Chiffres ────────────────────────────────────────────────────────────── */

const METRIC_TARGETS = [47, 1200, 4, 6, 10, 24]
const METRIC_SUFFIX = ["", "+", "", "", " %", " H"]
const METRIC_KEYS = [
  "site.met.countries",
  "site.met.partners",
  "site.met.hubs",
  "site.met.languages",
  "site.met.commission",
  "site.met.quoteTime",
]

export function MetricsSection() {
  const { t, language } = useLanguage()
  const ref = useRef<HTMLElement>(null)
  const values = useCountUp(METRIC_TARGETS, ref)

  return (
    <section ref={ref} className="relative border-t border-[var(--line)] bg-[var(--navy2)] py-[110px]">
      <div className="mx-auto max-w-[1440px] px-8">
        <div data-reveal className="mb-12">
          <span className="mb-[18px] block font-condensed text-[12px] font-semibold uppercase tracking-[.5em] text-gold">
            {t("site.met.eyebrow", "")}
          </span>
          <SectionTitle size="md">{t("site.met.title", "")}</SectionTitle>
        </div>
        <div className="grid gap-px bg-[var(--line)] [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          {METRIC_KEYS.map((key, i) => (
            <div
              key={key}
              className="bg-[var(--navy2)] px-6 py-[42px] transition-colors duration-[400ms] hover:bg-[hsl(216_40%_12%)]"
            >
              <span className="block font-display text-[clamp(44px,5.2vw,72px)] leading-[.9] text-gold [font-variant-numeric:tabular-nums]">
                {(values[i] ?? 0).toLocaleString(language === "en" ? "en-US" : "fr-FR")}
                {METRIC_SUFFIX[i]}
              </span>
              <span className="my-[14px] block h-[3px] w-11 bg-[hsl(42_85%_55%/.4)]" />
              <span className="block font-condensed text-[12px] font-semibold uppercase tracking-[.3em] text-white/50">
                {t(key, "")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Étapes ──────────────────────────────────────────────────────────────── */

export const STEP_KEYS = ["site.step1", "site.step2", "site.step3", "site.step4"] as const

export function StepsSection() {
  const { t } = useLanguage()

  return (
    <section className="relative border-t border-[var(--line)] bg-[var(--navy)] py-[130px]">
      <div className="mx-auto max-w-[1440px] px-8">
        <div data-reveal className="mb-[62px]">
          <Eyebrow>{t("site.how.eyebrow", "")}</Eyebrow>
          <SectionTitle>{t("site.how.title", "")}</SectionTitle>
        </div>
        <div className="grid gap-px bg-[var(--line)] [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          {STEP_KEYS.map((key, i) => (
            <div
              key={key}
              data-reveal
              className="relative bg-[var(--navy)] px-[26px] pb-11 pt-[38px] transition-colors duration-[400ms] hover:bg-[var(--navy2)]"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="font-display text-[62px] leading-[.8] text-[hsl(42_85%_55%/.24)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="border border-[hsl(42_85%_55%/.3)] px-[10px] py-[5px] font-condensed text-[11px] font-semibold uppercase tracking-[.26em] text-gold whitespace-nowrap">
                  {t(`${key}.tag`, "")}
                </span>
              </div>
              <h3 className="mb-3 mt-0 font-display text-[27px] leading-[1.05] text-white">
                {t(`${key}.title`, "")}
              </h3>
              <p className="m-0 text-[16px] font-light leading-[1.62] text-white/55 [text-wrap:pretty]">
                {t(`${key}.body`, "")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Témoignages ─────────────────────────────────────────────────────────── */

const QUOTES = {
  fr: [
    ["Le système de paiement séquencé m'a convaincu. Je ne paie le solde qu'à l'arrivée de mes marchandises.", "Jean-Pierre Kabongo", "Importateur, Kinshasa"],
    ["Alpha Import a considérablement simplifié nos opérations d'importation vers l'Afrique centrale. Un partenaire fiable.", "Fatima Al-Rashid", "CEO, Dubaï Trading Co."],
    ["Nous collaborons avec Alpha Import depuis 3 ans. Leur professionnalisme et leur rigueur sont exemplaires.", "Li Wei", "Exportateur, Guangzhou"],
    ["Grâce à Alpha Import, nous avons réduit nos délais de livraison de 40 %. Une vraie valeur ajoutée.", "Patrick Mwamba", "PDG, Mwamba Logistics"],
  ],
  en: [
    ["The sequenced payment system convinced me. I only pay the balance when my goods arrive.", "Jean-Pierre Kabongo", "Importer, Kinshasa"],
    ["Alpha Import has considerably simplified our import operations into Central Africa. A reliable partner.", "Fatima Al-Rashid", "CEO, Dubai Trading Co."],
    ["We have worked with Alpha Import for 3 years. Their professionalism and rigour are exemplary.", "Li Wei", "Exporter, Guangzhou"],
    ["Thanks to Alpha Import we cut our delivery times by 40 %. Real added value.", "Patrick Mwamba", "CEO, Mwamba Logistics"],
  ],
}

export function Testimonials() {
  const { language } = useLanguage()
  const [index, setIndex] = useState(0)
  const list = language === "en" ? QUOTES.en : QUOTES.fr

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % 4), 7200)
    return () => clearInterval(timer)
  }, [])

  const [text, name, role] = list[index]

  return (
    <section className="relative overflow-hidden border-y border-[var(--line)] bg-[var(--navy2)] py-[126px]">
      <div className="absolute inset-0 opacity-50 [background:repeating-linear-gradient(115deg,transparent_0_30px,hsl(42_85%_55%/.035)_30px_31px)]" />
      <div className="relative mx-auto max-w-[1100px] px-8 text-center">
        <span className="block font-display text-[104px] leading-[.6] text-[hsl(42_85%_55%/.3)]">“</span>
        <blockquote className="mt-[22px] font-display text-[clamp(26px,3.6vw,54px)] leading-[1.12] text-white [text-wrap:balance]">
          {text}
        </blockquote>
        <div className="mx-auto mb-5 mt-[34px] h-[3px] w-20 bg-gold" />
        <span className="block font-condensed text-[14px] font-semibold uppercase tracking-[.3em] text-gold">
          {name}
        </span>
        <span className="mt-2 block font-condensed text-[13px] uppercase tracking-[.22em] text-white/40">
          {role}
        </span>
        <div className="mt-[38px] flex justify-center gap-[10px]">
          {list.map((q, i) => (
            <button
              key={q[1]}
              onClick={() => setIndex(i)}
              aria-label={q[1]}
              className="h-[2px] border-none p-0 transition-[width,background] duration-[400ms]"
              style={{
                width: i === index ? 38 : 16,
                background: i === index ? "var(--gold)" : "rgba(255,255,255,.22)",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Appel final ─────────────────────────────────────────────────────────── */

export function CTASection() {
  const { t } = useLanguage()

  return (
    <section className="relative overflow-hidden bg-[var(--navy)] py-[146px]">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[.16]"
        style={{
          backgroundImage: `linear-gradient(90deg,hsl(216 45% 6% / .9),hsl(216 45% 6% / .3)), ${IMG("photo-1494412574643-ff11b0a5c1c3")}`,
        }}
      />
      <div className="relative mx-auto max-w-[1440px] px-8 text-center">
        <h2 className="m-0 font-display text-[clamp(46px,8vw,136px)] leading-[.86] text-white [text-wrap:balance]">
          {t("site.ctaSection.title", "")}
        </h2>
        <p className="mx-auto mt-[26px] max-w-[600px] text-[19px] font-light leading-[1.6] text-white/60 [text-wrap:pretty]">
          {t("site.ctaSection.body", "")}
        </p>
        <div className="mt-[42px] flex flex-wrap justify-center gap-[14px]">
          <Link
            href="/register"
            className="bg-gold px-11 py-[22px] font-condensed text-[13px] font-bold uppercase tracking-[.28em] text-[#0a1018] transition-transform duration-300 hover:-translate-y-[3px]"
          >
            {t("site.ctaSection.join", "Rejoindre Alpha Import")}
          </Link>
          <Link
            href="/partner-request"
            className="border border-[var(--line)] px-11 py-[22px] font-condensed text-[13px] font-bold uppercase tracking-[.28em] text-white/80 transition-colors duration-300 hover:border-gold hover:text-gold"
          >
            {t("site.nav.partners", "Partenaires")}
          </Link>
        </div>
      </div>
    </section>
  )
}
