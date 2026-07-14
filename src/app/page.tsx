"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { PublicFooter } from "@/components/public-footer"
import { QuoteWizard } from "@/components/quote-wizard"
import { TestimonialsCarousel } from "@/components/testimonials-carousel"

const services = [
  {
    number: "01",
    title: "Gestion des Imports",
    subtitle: "Solutions import clé en main.",
    description: "Coordination totale depuis le fournisseur jusqu'à votre entrepôt en DRC.",
    detail: "Sourcing · Négociation · Transport · Réception"
  },
  {
    number: "02",
    title: "Logistique Export",
    subtitle: "Pipelines d'export fiables.",
    description: "Reliez l'Afrique aux marchés mondiaux avec rapidité et précision.",
    detail: "Conditionnement · Fret maritime · Tracking GPS"
  },
  {
    number: "03",
    title: "Dédouanement",
    subtitle: "Procédures accélérées.",
    description: "Conformité douanière garantie dans 47 pays.",
    detail: "DRC · Belgique · Chine · UAE · USA"
  },
  {
    number: "04",
    title: "Analyse Supply Chain",
    subtitle: "Data en temps réel.",
    description: "Tableaux de bord et modélisation pour optimiser votre chaîne logistique.",
    detail: "KPI Live · Prévision · Optimisation coûts"
  }
]

const countries = [
  { emoji: "🇨🇩", country: "Congo-Kinshasa", code: "DRC", label: "Hub central — siège opérationnel" },
  { emoji: "🇨🇳", country: "Chine", code: "CHN", label: "Production et sourcing" },
  { emoji: "🇹🇷", country: "Turquie", code: "TUR", label: "Textile et composants" },
  { emoji: "🇯🇵", country: "Japon", code: "JPN", label: "Haute technologie" },
  { emoji: "🇹🇭", country: "Thaïlande", code: "THA", label: "Électronique et pièces" }
]

const stats = [
  { value: "$2.4B+", label: "Marchandises déplacées" },
  { value: "47", label: "Pays partenaires" },
  { value: "1 200+", label: "Partenaires actifs" },
  { value: "99.2%", label: "Taux de satisfaction" }
]

const processSteps = [
  { number: "01", title: "Demande", description: "Soumettez votre besoin et budget." },
  { number: "02", title: "Évaluation", description: "Validation rapide et sécurisation des fonds." },
  { number: "03", title: "Sourcing", description: "Partenaire local trouve le bon fournisseur." },
  { number: "04", title: "Livraison", description: "Suivi et réception finale en RDC." }
]

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#020205] text-white">
      <div className="relative overflow-hidden bg-[#020205] pb-24">
        <div className="absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_top,_rgba(79,140,255,0.2),transparent_30%)]" />
        <div className="absolute right-[-10%] top-24 h-96 w-96 rounded-full bg-[#7c3aed]/20 blur-3xl" />
        <div className="absolute left-[-8%] top-44 h-64 w-64 rounded-full bg-[#38bdf8]/15 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
          <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <Link href="/" className="flex items-start gap-3 text-xl font-semibold tracking-tight text-white">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white shadow-[0_10px_30px_-20px_rgba(255,255,255,0.5)]">AI</span>
              <div className="leading-tight">
                <span>Alpha Import Exchange</span>
                <p className="text-xs text-white/60">Filiale du Groupe A.Onoseke Investment RDC</p>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:border-white/20 md:hidden"
            >
              Menu
            </button>

            <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
              <Link href="#services" className="transition hover:text-white">Services</Link>
              <Link href="#partenaires" className="transition hover:text-white">Partenaires</Link>
              <Link href="#comment-ca-marche" className="transition hover:text-white">Comment ça marche</Link>
              <Link href="#devis" className="transition hover:text-white">Devis</Link>
              <Link href="#contact" className="transition hover:text-white">Contact</Link>
            </nav>

            <div className="hidden items-center gap-3 md:flex">
              <Button variant="ghost" asChild>
                <Link href="/login">Connexion</Link>
              </Button>
              <Button asChild className="h-14 rounded-full bg-gradient-to-r from-[#4d8cff] to-[#1f59ff] px-6 text-white shadow-[0_20px_80px_-50px_rgba(77,140,255,0.45)]">
                <Link href="/register">Accéder à la plateforme</Link>
              </Button>
            </div>
          </header>

          <div className={`${mobileMenuOpen ? "block" : "hidden"} md:hidden mt-6 rounded-3xl border border-white/10 bg-[#020308]/95 p-5`}> 
            <div className="space-y-3 text-sm text-white/70">
              <Link href="#services" className="block rounded-2xl px-4 py-3 transition hover:bg-white/5 hover:text-white">Services</Link>
              <Link href="#partenaires" className="block rounded-2xl px-4 py-3 transition hover:bg-white/5 hover:text-white">Partenaires</Link>
              <Link href="#comment-ca-marche" className="block rounded-2xl px-4 py-3 transition hover:bg-white/5 hover:text-white">Comment ça marche</Link>
              <Link href="#devis" className="block rounded-2xl px-4 py-3 transition hover:bg-white/5 hover:text-white">Devis</Link>
              <Link href="#contact" className="block rounded-2xl px-4 py-3 transition hover:bg-white/5 hover:text-white">Contact</Link>
            </div>
          </div>

          <section className="grid gap-16 lg:grid-cols-[1.05fr_0.95fr] items-center pt-20">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="space-y-8"
            >
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/70">
                47 PAYS PARTENAIRES
              </span>

              <div className="space-y-5 max-w-3xl">
                <p className="text-sm uppercase tracking-[0.35em] text-[#94a3b8]">Filiale du Groupe A.Onoseke Investment RDC</p>
                <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl leading-tight">
                  L'AFRIQUE — CONNECTÉE AU MONDE
                </h1>
                <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl leading-tight text-[#93c5fd]">
                  KINSHASA · DRC — Alpha Import Exchange
                </h2>
                <p className="text-lg text-muted-foreground leading-8">
                  Solutions d’import et logistique pour l’Afrique — conformité, traçabilité et hubs locaux.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Button size="lg" asChild className="h-16 rounded-full bg-gradient-to-r from-[#4d8cff] to-[#1f59ff] text-white px-10 shadow-[0_24px_80px_-40px_rgba(77,140,255,0.45)] transition-all hover:scale-[1.01]">
                  <Link href="/register">Accéder à la plateforme</Link>
                </Button>
                <Button variant="outline" size="lg" asChild className="h-16 rounded-full border border-white/15 px-10 text-white hover:border-[#4d8cff] hover:text-[#4d8cff] transition-all">
                  <Link href="#services">Découvrir →</Link>
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-[1.75rem] border border-white/10 bg-[#020308] p-6 text-center">
                    <p className="text-3xl font-semibold text-white mb-2">{stat.value}</p>
                    <p className="text-sm uppercase tracking-[0.35em] text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid gap-3 text-[11px] uppercase tracking-[0.35em] text-white/70 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  "ISO 9001 CERTIFIÉ",
                  "256-BIT SSL",
                  "SURVEILLANCE 24/7",
                  "98.7% LIVRAISONS À TEMPS",
                  "DRC · JAPON · USA · BELGIQUE · CHINE · UAE",
                  "DÉDOUANEMENT EXPRESS · TRAÇABILITÉ EN TEMPS RÉEL"
                ].map((item) => (
                  <div key={item} className="rounded-3xl border border-white/10 bg-[#020205]/80 px-4 py-3">
                    {item}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 36 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative"
            >
              <div className="rounded-[2rem] border border-white/10 bg-[#020308]/95 p-6 shadow-[0_40px_120px_-60px_rgba(0,0,0,0.75)] backdrop-blur-xl">
                <div className="mb-6 rounded-[1.75rem] border border-white/10 bg-[#03040d]/80 p-5">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-white/50">
                    <span>Workspace</span>
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.3em] text-white/80">Live</span>
                  </div>
                  <div className="mt-5 rounded-[1.5rem] bg-[#020814] p-5">
                    <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.35em] text-white/50">
                      <span>Alpha-import</span>
                      <span>Dernière mise à jour il y a 2 min</span>
                    </div>
                    <div className="space-y-3">
                      <div className="h-3 rounded-full bg-white/10 w-5/6" />
                      <div className="h-3 rounded-full bg-white/10 w-4/6" />
                      <div className="h-3 rounded-full bg-white/10 w-3/6" />
                      <div className="h-3 rounded-full bg-white/10 w-2/6" />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.75rem] border border-white/10 bg-[#020308] p-5">
                    <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Commandes</p>
                    <p className="mt-4 text-xl font-semibold text-white">8 dossiers en cours</p>
                    <p className="mt-3 text-sm text-muted-foreground">Validation et suivi automatisés par partenaire local.</p>
                  </div>
                  <div className="rounded-[1.75rem] border border-white/10 bg-[#020308] p-5">
                    <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Réseau</p>
                    <p className="mt-4 text-xl font-semibold text-white">Fournisseurs certifiés</p>
                    <p className="mt-3 text-sm text-muted-foreground">Chine, Turquie, Émirats, Japon et plus.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </section>
        </div>
      </div>

      <section id="services" className="py-24 bg-[#020205]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <p className="text-sm uppercase tracking-[0.35em] text-[#94a3b8] mb-4">Ce que nous faisons</p>
            <h2 className="text-4xl font-bold text-white tracking-tight">NOS SERVICES</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-4">
            {services.map((service) => (
              <motion.div
                key={service.number}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-[2rem] border border-white/10 bg-[#020308] p-8"
              >
                <div className="mb-6 flex items-center justify-between text-sm uppercase tracking-[0.35em] text-white/60">
                  <span className="text-[#93c5fd]">{service.number}</span>
                  <span className="rounded-full border border-white/10 px-3 py-1">VOIR →</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{service.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{service.description}</p>
                <p className="text-sm text-muted-foreground">{service.detail}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="partenaires" className="py-24 bg-[#020205]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="text-sm uppercase tracking-[0.35em] text-[#94a3b8] mb-4">Notre réseau mondial</p>
            <h2 className="text-4xl font-bold text-white tracking-tight">PAYS PARTENAIRES</h2>
          </div>

          <div className="grid gap-8 lg:grid-cols-[0.85fr_0.6fr] items-start">
            <div className="rounded-[2rem] border border-white/10 bg-[#020308] p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="text-5xl">🇨🇩</div>
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-[#94a3b8]">DRC</p>
                  <h3 className="text-2xl font-semibold text-white">Congo-Kinshasa</h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Hub central — siège opérationnel de la plateforme. Porte d'entrée vers l'Afrique centrale.</p>
              <div className="grid gap-4">
                <div className="rounded-3xl bg-[#020205] p-5">
                  <p className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Hubs</p>
                  <p className="mt-2 text-white">Kinshasa · Lubumbashi · Matadi</p>
                </div>
                <div className="rounded-3xl bg-[#020205] p-5">
                  <p className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Statut</p>
                  <p className="mt-2 text-white">Partenaire actif</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-[2rem] border border-white/10 bg-[#020308] p-8">
              {countries.map((country) => (
                <button key={country.code} className="flex w-full items-center gap-4 rounded-3xl border border-white/10 bg-[#020205] px-5 py-4 text-left transition hover:border-[#4d8cff]/30">
                  <span className="text-3xl">{country.emoji}</span>
                  <div>
                    <p className="font-semibold text-white">{country.country}</p>
                    <p className="text-sm text-muted-foreground">{country.code}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-[#020205]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-[#94a3b8]">Réseau de connexions</p>
              <h2 className="text-4xl font-bold text-white tracking-tight">PORTÉE MONDIALE</h2>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#020308] p-6 text-sm text-muted-foreground">
              Mapbox intégré avec marqueurs pour vos hubs stratégiques.
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.95fr_0.45fr]">
            <div className="rounded-[2rem] border border-white/10 bg-[#020308] p-8 min-h-[420px]">
              <div className="h-full rounded-[1.75rem] bg-[#020205] p-6">
                <div className="flex items-center justify-between text-sm text-white/50 mb-4">
                  <span>Map</span>
                  <span>Mapbox</span>
                </div>
                <div className="h-[320px] rounded-[1.5rem] bg-white/5" />
              </div>
              <div className="mt-6 text-sm text-white/60">
                <a href="https://www.mapbox.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 transition hover:bg-white/10">
                  Mapbox homepage
                </a>
              </div>
            </div>
            <div className="grid gap-4">
              <div className="rounded-[2rem] border border-white/10 bg-[#020308] p-8">
                <p className="text-4xl font-semibold text-white">47</p>
                <p className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Pays desservis</p>
              </div>
              <div className="rounded-[2rem] border border-white/10 bg-[#020308] p-8">
                <p className="text-4xl font-semibold text-white">8</p>
                <p className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Hubs stratégiques</p>
              </div>
              <div className="rounded-[2rem] border border-white/10 bg-[#020308] p-8">
                <p className="text-4xl font-semibold text-white">3</p>
                <p className="text-sm uppercase tracking-[0.35em] text-muted-foreground">Continents actifs</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="comment-ca-marche" className="py-24 bg-[#020205]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="text-sm uppercase tracking-[0.35em] text-[#94a3b8] mb-4">Processus simplifié</p>
            <h2 className="text-4xl font-bold text-white tracking-tight">COMMENT ÇA MARCHE</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-4">
            {processSteps.map((step) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-[2rem] border border-white/10 bg-[#020308] p-8 text-center"
              >
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#4d8cff]/10 text-2xl font-bold text-[#93c5fd]">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#020205]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <TestimonialsCarousel />
        </div>
      </section>

      <section id="contact" className="relative py-24 bg-[#020205]">
        <span id="devis" className="absolute -top-24" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2 items-start">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-[#94a3b8] mb-4">Contactez-nous</p>
              <h2 className="text-4xl sm:text-5xl font-semibold text-white mb-6">Parlez à un expert import dès aujourd’hui.</h2>
              <p className="text-lg text-muted-foreground mb-6">Remplissez notre rapide demande de devis ci-contre et recevez une proposition personnalisée.</p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Button size="lg" asChild className="h-14 rounded-full bg-gradient-to-r from-[#4d8cff] to-[#1f59ff] text-white px-6 shadow-[0_24px_80px_-40px_rgba(77,140,255,0.45)] transition-all hover:scale-[1.01]">
                  <Link href="/register">Accéder à la plateforme</Link>
                </Button>
                <Button variant="outline" size="lg" asChild className="h-14 rounded-full border border-white/15 px-6 text-white hover:border-[#4d8cff] hover:text-[#4d8cff] transition-all">
                  <Link href="/contact">Contact</Link>
                </Button>
              </div>
            </div>

            <div>
              <QuoteWizard />
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
