"use client"

import Image from "next/image"
import { useLanguage } from "@/lib/i18n-context"
import { SiteShell } from "@/components/site/site-shell"
import { useReveal } from "@/components/site/use-reveal"
import { PageHero, SectionTitle } from "@/components/site/sections"
import { NetworkMap } from "@/components/site/network-map"

const HUBS = ["hub1", "hub2", "hub3", "hub4"] as const

/**
 * Les cinq pays d'origine réellement opérés, alignés sur `CITIES` de
 * network-map.tsx et sur la table `countries`.
 *
 * Chaque entrée porte l'argumentaire qui justifie sa présence : un lecteur qui
 * voit cinq noms alignés sans explication n'apprend rien, et c'est le « pourquoi
 * ce pays » qui distingue un réseau choisi d'une liste de fournisseurs.
 *
 * Les chiffres par pays de l'ancienne version — « 450+ partenaires », « +12 % »
 * — ne sont pas repris : rien dans le produit ne les soutient, et ils
 * contredisaient le total annoncé ailleurs.
 */
const ORIGINS = [
  {
    id: "china",
    flag: "🇨🇳",
    name: "Chine",
    titre: "L'usine du monde",
    corps:
      "Infrastructure de production sans équivalent, et la capacité de personnaliser en grande série sans faire exploser le prix unitaire.",
    atouts: ["Capacité de production", "Écosystème technologique", "Rapport qualité-prix", "Réactivité industrielle"],
    filieres: "Électronique · Machines · Textile",
    image: "https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?auto=format&fit=crop&q=80&w=1600",
  },
  {
    id: "turkey",
    flag: "🇹🇷",
    name: "Turquie",
    titre: "Le pont entre l'Europe et l'Asie",
    corps:
      "Une qualité alignée sur les normes européennes, à quelques jours de mer seulement. Le choix quand le délai compte autant que le prix.",
    atouts: ["Normes européennes", "Délais courts", "Savoir-faire textile", "Coûts logistiques bas"],
    filieres: "Textile · Ameublement · Construction",
    image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&q=80&w=1600",
  },
  {
    id: "uae",
    flag: "🇦🇪",
    name: "Émirats arabes unis",
    titre: "Le carrefour logistique",
    corps:
      "Zone franche et infrastructure portuaire de premier plan : le transit y est le plus rapide pour les marchandises à forte valeur.",
    atouts: ["Zone franche", "Hub portuaire", "Douane rapide", "Accès aux marques"],
    filieres: "Luxe · Cosmétiques · Électronique",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=1600",
  },
  {
    id: "japan",
    flag: "🇯🇵",
    name: "Japon",
    titre: "L'exigence technologique",
    corps:
      "La référence quand la tolérance de fabrication ne se négocie pas : haute technologie et ingénierie de précision.",
    atouts: ["Innovation", "Fabrication irréprochable", "Durabilité", "Design de précision"],
    filieres: "Robotique · Automobile · Machines-outils",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&q=80&w=1600",
  },
  {
    id: "thailand",
    flag: "🇹🇭",
    name: "Thaïlande",
    titre: "La rigueur manufacturière",
    corps:
      "Standards sanitaires stricts et régularité des approvisionnements : le partenaire de l'agroalimentaire et des pièces techniques.",
    atouts: ["Standards sanitaires", "Excellence manufacturière", "Approvisionnement stable", "Expertise technique"],
    filieres: "Agroalimentaire · Pièces détachées · Bijouterie",
    image: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&q=80&w=1600",
  },
] as const

/** Les trois raisons communes à toutes ces implantations. */
const CRITERES = ["eco", "quality", "speed"] as const

export default function NetworkPage() {
  const { t } = useLanguage()
  useReveal()

  return (
    <SiteShell>
      <PageHero
        eyebrow={t("site.net.eyebrow", "Notre réseau")}
        title={t("site.net.pageTitle", "LE RÉSEAU")}
        body={t("site.net.pageBody", "")}
        image="photo-1494412574643-ff11b0a5c1c3"
      />

      <section className="bg-[var(--navy)] pb-10">
        <div className="mx-auto max-w-[1440px] px-8">
          <div
            data-reveal
            className="relative border border-[var(--line)] bg-card/60"
            style={{ height: "clamp(360px, 50vw, 620px)" }}
          >
            <NetworkMap />
            <div className="absolute bottom-[18px] left-5 flex flex-wrap gap-[22px]">
              <span className="flex items-center gap-[9px] font-condensed text-[11px] uppercase tracking-[.3em] text-foreground/40">
                <span className="block h-[7px] w-[7px] rounded-full bg-gold" />
                {t("site.net.legendHub", "Hub Kinshasa")}
              </span>
              <span className="flex items-center gap-[9px] font-condensed text-[11px] uppercase tracking-[.3em] text-foreground/40">
                <span className="block h-px w-[22px] bg-primary/60" />
                {t("site.net.legendRoute", "Corridor actif")}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--navy)] pb-[100px] pt-[76px]">
        <div className="mx-auto max-w-[1440px] px-8">
          <div data-reveal className="mb-[38px]">
            <SectionTitle size="sm">{t("site.net.hubsTitle", "QUATRE HUBS MONDIAUX")}</SectionTitle>
          </div>
          <div className="grid gap-px bg-[var(--line)] [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {HUBS.map((key) => (
              <div
                key={key}
                data-reveal
                className="border-t-2 border-transparent bg-[var(--navy2)] px-[26px] pb-11 pt-[38px] transition-colors duration-[400ms] hover:border-gold"
              >
                <span className="mb-[14px] block font-condensed text-[11px] font-bold uppercase tracking-[.32em] text-gold">
                  {t(`site.net.${key}.tag`, "")}
                </span>
                <h3 className="mb-3 mt-0 font-display text-[29px] leading-[1.05] text-foreground">
                  {t(`site.net.${key}.cities`, "")}
                </h3>
                <p className="m-0 text-[16px] font-light leading-[1.62] text-foreground/55 [text-wrap:pretty]">
                  {t(`site.net.${key}.body`, "")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-[var(--line)] bg-[var(--navy2)] pb-[110px] pt-24">
        <div className="absolute inset-0 opacity-50 [background:repeating-linear-gradient(115deg,transparent_0_30px,hsl(42_85%_55%/.035)_30px_31px)]" />
        <div className="relative mx-auto max-w-[1440px] px-8">
          <div data-reveal className="mb-[18px]">
            <SectionTitle size="sm">{t("site.net.originsTitle", "")}</SectionTitle>
          </div>
          <p
            data-reveal
            className="mb-10 max-w-[660px] text-[18px] font-light leading-[1.62] text-foreground/55 [text-wrap:pretty]"
          >
            {t("site.net.originsBody", "")}
          </p>
          {/*
            Une bande de cinq noms alignés n'apprenait rien au lecteur. Chaque
            pays porte désormais ce qui justifie sa présence dans le réseau :
            une photographie du lieu, l'angle retenu, et les filières couvertes.
            L'alternance gauche/droite évite qu'une succession de cinq blocs
            identiques se lise comme un tableau.
          */}
          <div className="space-y-px bg-[var(--line)]">
            {ORIGINS.map((pays, i) => (
              <article
                key={pays.id}
                data-reveal
                className={`grid gap-px bg-[var(--line)] md:grid-cols-2 ${
                  i % 2 === 1 ? "md:[direction:rtl]" : ""
                }`}
              >
                <div className="relative min-h-[280px] bg-[var(--navy)] md:min-h-[340px]">
                  <Image
                    src={pays.image}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover opacity-70"
                  />
                  {/* Voile dégradé : le texte du bloc voisin doit rester lisible
                      quelle que soit la photo. */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--navy)] via-transparent to-transparent" />
                  <span
                    aria-hidden
                    className="absolute bottom-5 start-6 text-[38px] leading-none"
                  >
                    {pays.flag}
                  </span>
                </div>

                <div className="bg-[var(--navy2)] px-[30px] py-10 [direction:ltr] md:px-[46px] md:py-[54px]">
                  <span className="t-eyebrow block text-gold">{pays.name}</span>
                  <h3 className="mb-4 mt-3 font-display text-[32px] leading-[1.05] text-foreground">
                    {pays.titre}
                  </h3>
                  <p className="m-0 text-[17px] font-light leading-[1.62] text-foreground/55 [text-wrap:pretty]">
                    {pays.corps}
                  </p>

                  <ul className="mt-7 grid list-none gap-x-6 gap-y-[10px] p-0 sm:grid-cols-2">
                    {pays.atouts.map((atout) => (
                      <li
                        key={atout}
                        className="flex items-start gap-[10px] text-[15px] font-light text-foreground/70"
                      >
                        <span
                          aria-hidden
                          className="mt-[7px] block h-[5px] w-[5px] shrink-0 rounded-full bg-gold"
                        />
                        {atout}
                      </li>
                    ))}
                  </ul>

                  <p className="t-label mt-8 mb-0 text-foreground/40">{pays.filieres}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/*
        Le critère de sélection, qui répond à la question que pose la liste
        elle-même : pourquoi ces cinq-là. Sans cette section, le réseau se lit
        comme un carnet d'adresses hérité plutôt que comme un choix.
      */}
      <section className="border-t border-[var(--line)] bg-[var(--navy)] pb-[110px] pt-[86px]">
        <div className="mx-auto max-w-[1440px] px-8">
          <div data-reveal className="mb-[18px]">
            <SectionTitle size="sm">
              {t("site.net.whyTitle", "POURQUOI CES PAYS")}
            </SectionTitle>
          </div>
          <p
            data-reveal
            className="mb-11 max-w-[660px] text-[18px] font-light leading-[1.62] text-foreground/55 [text-wrap:pretty]"
          >
            {t(
              "site.net.whyBody",
              "Chaque implantation est retenue pour un avantage précis, pas pour élargir une liste. Trois critères décident."
            )}
          </p>
          <div className="grid gap-px bg-[var(--line)] [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
            {CRITERES.map((cle) => (
              <div
                key={cle}
                data-reveal
                className="border-t-2 border-transparent bg-[var(--navy2)] px-[30px] pb-11 pt-[38px] transition-colors duration-[400ms] hover:border-gold"
              >
                <span className="t-eyebrow mb-[14px] block text-gold">
                  {t(`site.net.why.${cle}.tag`, "")}
                </span>
                <h3 className="mb-3 mt-0 font-display text-[27px] leading-[1.08] text-foreground">
                  {t(`site.net.why.${cle}.title`, "")}
                </h3>
                <p className="m-0 text-[16px] font-light leading-[1.62] text-foreground/55 [text-wrap:pretty]">
                  {t(`site.net.why.${cle}.body`, "")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  )
}
