"use client"

import Link from "next/link"
import { useLanguage } from "@/lib/i18n-context"
import { SiteShell } from "@/components/site/site-shell"
import { useReveal } from "@/components/site/use-reveal"
import Image from "next/image"
import { PageHero, SectionTitle, Eyebrow } from "@/components/site/sections"

const VALUES = ["v1", "v2", "v3"] as const

/**
 * Les deux personnes à l'origine du groupe.
 *
 * Cette section, le récit de fondation et la vision avaient été supprimés le
 * 19 août avec la refonte des pages publiques, au motif qu'elles « ne
 * contenaient pas de code fonctionnel ». C'était vrai et hors sujet : sur une
 * page « Qui sommes-nous », les dirigeants sont le contenu.
 *
 * Les portraits étaient servis par un ancien projet Supabase, distinct de celui
 * de la plateforme et hors de notre contrôle. Ils répondaient encore, mais la
 * page des dirigeants serait devenue vide le jour de sa suppression, sans que
 * personne ne s'en aperçoive. Ils sont désormais dans `public/direction/`.
 */
const DIRIGEANTS = [
  {
    id: "fondateur",
    nom: "Monsieur Ambity A.Alpha",
    role: "Fondateur et initiateur de la vision",
    image: "/direction/fondateur.jpg",
  },
  {
    id: "pdg",
    nom: "Madame Salima Onoseke Nzikisa",
    role: "Présidente Directrice Générale",
    image: "/direction/pdg.jpg",
  },
] as const

export default function AboutPage() {
  const { t } = useLanguage()
  useReveal()

  return (
    <SiteShell>
      <PageHero
        eyebrow={t("site.about.eyebrow", "Qui sommes-nous")}
        title={t("site.about.title", "UNE INFRASTRUCTURE, PAS UN INTERMÉDIAIRE")}
        body={t("site.about.body", "")}
        image="photo-1620714223084-8fcacc6dfd8d"
      />

      <section className="border-t border-[var(--line)] bg-[var(--navy2)] py-[110px]">
        <div className="mx-auto max-w-[1440px] px-8">
          <div data-reveal className="max-w-[820px]">
            <Eyebrow>{t("site.about.eyebrow", "Qui sommes-nous")}</Eyebrow>
            <SectionTitle size="md">{t("site.about.missionTitle", "NOTRE RAISON D'ÊTRE")}</SectionTitle>
            <div
              className="mt-7 h-4 w-[120px] origin-left bg-gold"
              style={{ animation: "barIn .9s .2s cubic-bezier(.16,1,.3,1) both" }}
            />
            <p className="mt-7 text-[19px] font-light leading-[1.62] text-foreground/60 [text-wrap:pretty]">
              {t("site.about.missionBody", "")}
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--line)] bg-[var(--navy)] py-[100px]">
        <div className="mx-auto max-w-[1440px] px-8">
          <div className="grid gap-px bg-[var(--line)] [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
            {VALUES.map((key) => (
              <div
                key={key}
                data-reveal
                className="border-t-2 border-transparent bg-[var(--navy)] px-[28px] pb-11 pt-9 transition-[border-color,background] duration-[400ms] hover:border-gold hover:bg-[var(--navy2)]"
              >
                <span className="mb-4 block font-condensed text-[11px] font-bold uppercase tracking-[.32em] text-gold">
                  {t(`site.about.${key}.tag`, "")}
                </span>
                <h3 className="mb-3 mt-0 font-display text-[28px] leading-[1.05] text-foreground">
                  {t(`site.about.${key}.title`, "")}
                </h3>
                <p className="m-0 text-[16px] font-light leading-[1.62] text-foreground/55 [text-wrap:pretty]">
                  {t(`site.about.${key}.body`, "")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Histoire ------------------------------------------------------- */}
      <section className="border-t border-[var(--line)] bg-[var(--navy)] py-[110px]">
        <div className="mx-auto max-w-[1440px] px-8">
          <div className="grid items-center gap-14 lg:grid-cols-[1fr_0.85fr]">
            <div data-reveal>
              <Eyebrow>{t("site.about.storyEyebrow", "Notre histoire")}</Eyebrow>
              <SectionTitle size="md">
                {t("site.about.storyTitle", "UNE VISION AUDACIEUSE, NÉE EN 2019")}
              </SectionTitle>
              <div className="mt-7 max-w-[620px] space-y-5 text-[18px] font-light leading-[1.65] text-foreground/60 [text-wrap:pretty]">
                <p>
                  {t(
                    "site.about.storyP1",
                    "Fondé en 2019, le Groupe A.Onoseke House Investment RDC est né d'une volonté audacieuse de redéfinir l'entrepreneuriat en République Démocratique du Congo."
                  )}
                </p>
                <p>
                  {t(
                    "site.about.storyP2",
                    "Cette structure est le fruit de la synergie entre deux visionnaires qui ont uni leur expertise pour créer un écosystème d'affaires robuste, capable de répondre aux défis complexes du marché congolais tout en s'ouvrant à l'international."
                  )}
                </p>
              </div>
            </div>
            <div data-reveal className="relative aspect-[4/3] border border-[var(--line)]">
              <Image
                src="/direction/fondation.jpg"
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover opacity-80"
              />
              <div className="absolute bottom-0 start-0 bg-gold px-6 py-4">
                <p className="font-display text-[34px] leading-none text-primary-foreground">2019</p>
                <p className="t-label mt-1 text-primary-foreground/70">
                  {t("site.about.founded", "Année de fondation")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dirigeants ------------------------------------------------------ */}
      <section className="border-t border-[var(--line)] bg-[var(--navy2)] py-[110px]">
        <div className="mx-auto max-w-[1440px] px-8">
          <div data-reveal className="mb-12">
            <Eyebrow>{t("site.about.leadershipEyebrow", "Direction")}</Eyebrow>
            <SectionTitle size="md">{t("site.about.leadershipTitle", "LES VISIONNAIRES")}</SectionTitle>
          </div>
          {/*
            Largeur bornée : à pleine largeur, chaque cadre atteignait 688 × 859,
            au-delà de la hauteur native de la photographie du fondateur (675 px)
            — elle aurait été agrandie, donc adoucie. Deux portraits de cette
            taille écrasaient par ailleurs le reste de la page.
          */}
          <div className="mx-auto grid max-w-[980px] gap-px bg-[var(--line)] md:grid-cols-2">
            {DIRIGEANTS.map((personne) => (
              <article key={personne.id} data-reveal className="bg-[var(--navy)]">
                {/* Portrait cadré en 4/5 : un portrait carré coupe les épaules,
                    un 16/9 les noie dans le décor. */}
                <div className="relative aspect-[4/5] w-full">
                  <Image
                    src={personne.image}
                    alt={personne.nom}
                    fill
                    sizes="(max-width: 768px) 100vw, 490px"
                    className="object-cover object-top"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--navy)] via-transparent to-transparent" />
                </div>
                <div className="px-[30px] py-8 md:px-10 md:py-10">
                  <p className="t-eyebrow text-gold">{personne.role}</p>
                  <h3 className="mt-3 font-display text-[30px] leading-[1.05] text-foreground">
                    {personne.nom}
                  </h3>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Vision ---------------------------------------------------------- */}
      <section className="relative overflow-hidden border-t border-[var(--line)] bg-[var(--navy)] py-[120px]">
        <div className="absolute inset-0 opacity-60 [background:radial-gradient(ellipse_at_50%_25%,hsl(42_85%_55%/.10)_0%,transparent_60%)]" />
        <div className="relative mx-auto max-w-[1440px] px-8 text-center">
          <div data-reveal>
            <Eyebrow>{t("site.about.visionEyebrow", "Notre vision")}</Eyebrow>
            <blockquote className="mx-auto mt-6 max-w-[900px] font-display text-[clamp(38px,6vw,74px)] leading-[1.02] text-foreground">
              {t("site.about.visionQuote", "« FAIRE AU CONGO, POUR LE CONGO. »")}
            </blockquote>
            <div className="mx-auto mt-10 max-w-[760px] space-y-5 text-[18px] font-light leading-[1.65] text-foreground/60 [text-wrap:pretty]">
              <p>
                {t(
                  "site.about.visionP1",
                  "Notre ambition est l'émergence d'une nouvelle génération de Congolais : conscients, productifs et créateurs de richesse."
                )}
              </p>
              <p>
                {t(
                  "site.about.visionP2",
                  "Nous ne voulons pas seulement des consommateurs, mais des producteurs acteurs de leur propre développement. Bâtir une économie résiliente où l'excellence locale rivalise avec les standards internationaux."
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-[var(--line)] bg-[var(--navy2)] py-[110px]">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[.14]"
          style={{
            backgroundImage:
              "linear-gradient(90deg,hsl(216 45% 6% / .92),hsl(216 45% 6% / .4)), url('https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1600&q=70')",
          }}
        />
        <div className="relative mx-auto max-w-[1440px] px-8">
          <div data-reveal className="max-w-[720px]">
            <SectionTitle size="sm">{t("site.about.groupTitle", "LE GROUPE")}</SectionTitle>
            <p className="mt-6 text-[18px] font-light leading-[1.65] text-foreground/60 [text-wrap:pretty]">
              {t("site.about.groupBody", "")}
            </p>
            <div className="mt-9 flex flex-wrap gap-[14px]">
              <Link
                href="/plateforme"
                className="bg-gold px-[38px] py-[19px] font-condensed text-[12px] font-bold uppercase tracking-[.28em] text-primary-foreground whitespace-nowrap"
              >
                {t("site.nav.platform", "Plateforme")}
              </Link>
              <Link
                href="/contact"
                className="border border-[var(--line)] px-[38px] py-[19px] font-condensed text-[12px] font-bold uppercase tracking-[.28em] text-foreground/80 transition-colors duration-300 hover:border-gold hover:text-gold"
              >
                {t("site.quote.title", "DEMANDER UNE COTATION")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  )
}
