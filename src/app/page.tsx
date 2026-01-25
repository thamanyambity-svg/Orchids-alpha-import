"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Shield,
  ArrowRight,
  Lock,
  Eye,
  FileCheck,
  Globe2,
  Wallet,
  Users,
  CheckCircle2,
  ChevronRight,
  Ship,
  Factory,
  Landmark
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"

const heroImages = [
  {
    url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop",
    title: "Logistique Mondiale",
    alt: "Port de conteneurs avec une équipe diversifiée"
  },
  {
    url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop",
    title: "Partenariat de Confiance",
    alt: "Équipe professionnelle multiculturelle en réunion"
  },
  {
    url: "https://images.unsplash.com/photo-1494412519320-aa613dfb7738?q=80&w=2070&auto=format&fit=crop",
    title: "Sourcing International",
    alt: "Contrôle qualité dans une usine moderne"
  },
  {
    url: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=2084&auto=format&fit=crop",
    title: "Engagement & Valeurs",
    alt: "Poignée de main symbolisant la confiance et la diversité"
  }
]

const features = [
  {
    icon: Lock,
    title: "Fonds sécurisés",
    description: "Vos paiements sont bloqués jusqu'à validation. Aucun décaissement sans contrôle Alpha."
  },
  {
    icon: Eye,
    title: "Traçabilité totale",
    description: "Chaque étape documentée, horodatée, vérifiable. De la commande à la livraison."
  },
  {
    icon: FileCheck,
    title: "Partenaires certifiés",
    description: "Un partenaire exclusif par pays, sous contrat, avec caution déposée."
  },
  {
    icon: Shield,
    title: "Arbitrage garanti",
    description: "En cas d'incident, Alpha intervient. Assurance, compensation, résolution."
  }
]

const steps = [
  {
    number: "01",
    title: "Formulez votre demande",
    description: "Décrivez votre besoin d'importation. Pays, produit, quantité, budget.",
    icon: FileCheck
  },
  {
    number: "02",
    title: "Payez 60% sécurisés",
    description: "Vos fonds sont bloqués sur notre compte séquestre jusqu'à validation.",
    icon: Wallet
  },
  {
    number: "03",
    title: "Sourcing & contrôle",
    description: "Notre partenaire local source, négocie et contrôle pour vous.",
    icon: Factory
  },
  {
    number: "04",
    title: "Expédition suivie",
    description: "Logistique internationale avec tracking et documentation complète.",
    icon: Ship
  },
  {
    number: "05",
    title: "Livraison & solde",
    description: "Confirmation de réception. Paiement des 40% restants. Dossier clôturé.",
    icon: CheckCircle2
  }
]

const countries = [
  {
    code: "CHN",
    name: "Chine",
    flag: "🇨🇳",
    region: "Asie",
    image: "https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?q=80&w=2070&auto=format&fit=crop"
  },
  {
    code: "ARE",
    name: "Émirats",
    flag: "🇦🇪",
    region: "Moyen-Orient",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=2070&auto=format&fit=crop"
  },
  {
    code: "TUR",
    name: "Turquie",
    flag: "🇹🇷",
    region: "Europe",
    image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=2071&auto=format&fit=crop"
  },
  {
    code: "THA",
    name: "Thaïlande",
    flag: "🇹🇭",
    region: "Asie",
    image: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?q=80&w=2070&auto=format&fit=crop"
  },
  {
    code: "JPN",
    name: "Japon",
    flag: "🇯🇵",
    region: "Asie",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2070&auto=format&fit=crop"
  },
]

const stats = [
  { value: "100%", label: "Fonds sécurisés" },
  { value: "1:1", label: "Partenaire par pays" },
  { value: "60/40", label: "Modèle de paiement" },
  { value: "24/7", label: "Suivi en temps réel" },
]

export default function HomePage() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen">
      <PublicHeader />

      <main>
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black selection:bg-gold/30">
          {/* Dynamic Background */}
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black" />

            {/* Animated Gold Orbs */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
                x: [0, 50, 0],
                y: [0, -30, 0]
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gold/10 rounded-full blur-[120px]"
            />
            <motion.div
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.2, 0.4, 0.2],
                x: [0, -40, 0],
                y: [0, 40, 0]
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px]"
            />

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 flex flex-col items-center text-center">

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="mb-8"
            >
              <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full glass border border-gold/20 text-sm text-gold font-medium mb-8 shadow-[0_0_20px_-5px_rgba(255,215,0,0.3)]">
                <Shield className="w-4 h-4" />
                <span className="tracking-wide uppercase text-xs">L'Excellence Logistique</span>
              </div>

              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tighter mb-8 text-white">
                Importez <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold via-[#FFF8D6] to-gold animate-gradient-x bg-[length:200%_auto]">
                  Sans Limites
                </span>
              </h1>

              <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed font-light">
                La première plateforme qui fusionne <span className="text-white font-medium">sécurisation financière</span> et <span className="text-white font-medium">logistique de précision</span>.
                De la Chine à Kinshasa, contrôlez chaque étape.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Button size="lg" asChild className="h-16 px-10 text-lg bg-gold text-black hover:bg-[#F0C000] transition-all duration-300 shadow-[0_0_30px_-5px_rgba(255,215,0,0.4)] hover:shadow-[0_0_40px_-5px_rgba(255,215,0,0.6)] hover:-translate-y-1">
                  <Link href="/register" className="flex items-center gap-2 font-bold">
                    Commencer
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="h-16 px-10 text-lg border-white/10 hover:bg-white/5 hover:border-white/30 backdrop-blur-md transition-all duration-300">
                  <Link href="/how-it-works">
                    Découvrir le modèle
                  </Link>
                </Button>
              </div>
            </motion.div>

            {/* Stats Glass Cards */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-5xl"
            >
              {[
                { label: "Sécurité", value: "100%", sub: "Fonds garantis" },
                { label: "Réseau", value: "5+", sub: "Pays partenaires" },
                { label: "Support", value: "24/7", sub: "Assistance dédiée" },
                { label: "Rapidité", value: "Express", sub: "Douane prioritaire" }
              ].map((stat, index) => (
                <div key={index} className="group glass p-6 rounded-2xl border border-white/5 hover:border-gold/30 transition-all duration-500 hover:-translate-y-1 hover:shadow-lg hover:shadow-gold/5">
                  <div className="text-3xl sm:text-4xl font-bold text-white mb-1 group-hover:text-gold transition-colors">{stat.value}</div>
                  <div className="text-xs font-bold text-gold uppercase tracking-widest mb-1">{stat.label}</div>
                  <div className="text-xs text-gray-500">{stat.sub}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          >
            <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Explorer</span>
            <div className="w-[1px] h-12 bg-gradient-to-b from-gold/0 via-gold/50 to-gold/0" />
          </motion.div>
        </section>

        <section className="py-32 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Pourquoi <span className="text-gradient-gold">Alpha</span> ?
              </h2>
              <p className="text-muted-foreground">
                Une infrastructure conçue pour éliminer les risques du commerce international.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="group p-6 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md hover:bg-white/10 hover:border-gold/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]"
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gold/20 to-transparent flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-gold/10">
                    <feature.icon className="w-7 h-7 text-gold" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white group-hover:text-gold transition-colors">{feature.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-32 bg-card/50 relative">
          <div className="absolute inset-0 pattern-dots opacity-20" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Comment ça <span className="text-gradient-gold">marche</span> ?
              </h2>
              <p className="text-muted-foreground">
                Un processus en 5 étapes, transparent et sécurisé à chaque instant.
              </p>
            </div>

            <div className="relative">
              <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent" />

              <div className="grid lg:grid-cols-5 gap-8">
                {steps.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="relative text-center"
                  >
                    <div className="relative z-10 w-16 h-16 mx-auto rounded-2xl bg-card border border-border flex items-center justify-center mb-6">
                      <step.icon className="w-7 h-7 text-primary" />
                    </div>
                    <div className="text-xs font-mono text-primary mb-2">{step.number}</div>
                    <h3 className="font-semibold mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="mt-16 text-center">
              <Button size="lg" variant="outline" asChild className="group">
                <Link href="/how-it-works" className="flex items-center gap-2">
                  En savoir plus sur le processus
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-32 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                  Le modèle <span className="text-gradient-gold">60/40</span>
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Un système de paiement fractionné qui protège toutes les parties.
                  Vos fonds restent sous contrôle Alpha jusqu&apos;à livraison confirmée.
                </p>

                <div className="space-y-6">
                  <div className="flex gap-4 p-4 rounded-xl bg-card border border-border group hover:border-gold/30 transition-colors">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <span className="text-lg font-bold text-primary">60%</span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Acompte sécurisé</h4>
                      <p className="text-sm text-muted-foreground">
                        Payé à la validation. Bloqué jusqu&apos;à autorisation Alpha.
                        Finance le sourcing et l&apos;achat.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 rounded-xl bg-card border border-border group hover:border-gold/30 transition-colors">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <span className="text-lg font-bold text-primary">40%</span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Solde à livraison</h4>
                      <p className="text-sm text-muted-foreground">
                        Payé après confirmation de réception. Libère les fonds partenaire
                        et commissions Alpha.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent rounded-3xl blur-2xl animate-pulse" />
                <div className="relative p-8 rounded-2xl glass border border-white/10">
                  <div className="flex items-center gap-3 mb-6">
                    <Landmark className="w-6 h-6 text-primary" />
                    <span className="font-semibold text-white">Flux financier sécurisé</span>
                  </div>

                  <div className="space-y-4">
                    {[
                      { label: "Acheteur", arrow: true },
                      { label: "Compte Alpha (séquestre)", highlight: true, arrow: true },
                      { label: "Validation Admin", arrow: true },
                      { label: "Partenaire local", arrow: true },
                      { label: "Fournisseur" }
                    ].map((item, index) => (
                      <div key={index}>
                        <div className={`p-3 rounded-lg transition-all hover:scale-[1.02] ${item.highlight ? 'bg-gold/10 border border-gold/30' : 'bg-white/5 border border-white/5'}`}>
                          <span className={`text-sm ${item.highlight ? 'text-gold font-bold shadow-gold' : 'text-gray-300'}`}>
                            {item.label}
                          </span>
                        </div>
                        {item.arrow && (
                          <div className="flex justify-center py-2">
                            <div className="w-px h-4 bg-gradient-to-b from-white/20 to-transparent" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-32 bg-card/50 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Pays <span className="text-gradient-gold">partenaires</span>
              </h2>
              <p className="text-muted-foreground">
                Un partenaire certifié par pays. Contrat exclusif. Caution déposée.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {countries.map((country, index) => (
                <motion.div
                  key={country.code}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="group relative overflow-hidden rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-300 h-80"
                >
                  {/* Country Background Image */}
                  <div
                    className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                    style={{ backgroundImage: `url(${country.image})` }}
                  />
                  <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black via-black/40 to-transparent" />

                  {/* Content */}
                  <div className="relative z-10 h-full p-6 flex flex-col justify-end text-left">
                    <div className="text-4xl mb-3 drop-shadow-md transform group-hover:-translate-y-2 transition-transform duration-500">{country.flag}</div>
                    <div className="w-8 h-1 bg-gold mb-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <h3 className="text-2xl font-bold text-white mb-1 tracking-wide">{country.name}</h3>
                    <p className="text-sm text-gray-300 mb-4 font-light tracking-wider">{country.region}</p>
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-gold font-bold bg-black/50 border border-gold/30 w-fit px-3 py-1.5 rounded-full backdrop-blur-md">
                      <CheckCircle2 className="w-3 h-3" />
                      Partenaire actif
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Link
                href="/countries"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                Voir tous les pays disponibles
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Globe2 className="w-16 h-16 text-primary mx-auto mb-8" />
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Prêt à sécuriser vos importations ?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Rejoignez Alpha Import Exchange RDC et bénéficiez d&apos;une infrastructure
                de confiance pour vos opérations internationales.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" asChild className="h-14 px-8 text-base group glow-gold">
                  <Link href="/register" className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Créer un compte Acheteur
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="h-14 px-8 text-base">
                  <Link href="/partner-request">
                    Devenir Partenaire
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
