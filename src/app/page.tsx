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
  { code: "CHN", name: "Chine", flag: "🇨🇳", region: "Asie" },
  { code: "ARE", name: "Émirats", flag: "🇦🇪", region: "Moyen-Orient" },
  { code: "TUR", name: "Turquie", flag: "🇹🇷", region: "Europe" },
  { code: "THA", name: "Thaïlande", flag: "🇹🇭", region: "Asie" },
  { code: "JPN", name: "Japon", flag: "🇯🇵", region: "Asie" },
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
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Background Image Carousel */}
          <div className="absolute inset-0 z-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentImageIndex}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="absolute inset-0"
              >
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-[5000ms]"
                  style={{ 
                    backgroundImage: `url(${heroImages[currentImageIndex].url})`,
                  }}
                />
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/40" />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="absolute inset-0 pattern-grid opacity-20 z-[1]" />
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-4xl mx-auto"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 text-sm text-primary font-medium mb-8 backdrop-blur-sm">
                <Shield className="w-4 h-4" />
                Infrastructure de confiance
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-8 text-white">
                Nous ne connectons pas.{" "}
                <span className="text-gradient-gold">Nous sécurisons</span>{" "}
                le commerce international.
              </h1>
              
              <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-12">
                Alpha Import Exchange RDC est l&apos;infrastructure de confiance pour vos importations 
                Afrique-Asie. Contrôle total. Traçabilité complète. Zéro risque.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" asChild className="h-14 px-8 text-base group glow-gold">
                  <Link href="/register" className="flex items-center gap-2">
                    Commencer une importation
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="h-14 px-8 text-base bg-white/5 hover:bg-white/10 text-white border-white/20">
                  <Link href="/how-it-works">
                    Voir comment ça marche
                  </Link>
                </Button>
              </div>

              {/* Carousel Indicators */}
              <div className="mt-16 flex justify-center gap-3">
                {heroImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-12 h-1 rounded-full transition-all duration-500 ${
                      index === currentImageIndex 
                        ? "bg-primary w-20" 
                        : "bg-white/20 hover:bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-8"
            >
              {stats.map((stat, index) => (
                <div key={index} className="text-center backdrop-blur-sm bg-black/20 p-4 rounded-2xl border border-white/5">
                  <div className="text-3xl sm:text-4xl font-bold text-gradient-gold mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-400 font-medium uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
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
                  className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
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
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                  Le modèle <span className="text-gradient-gold">60/40</span>
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Un système de paiement fractionné qui protège toutes les parties. 
                  Vos fonds restent sous contrôle Alpha jusqu&apos;à livraison confirmée.
                </p>

                <div className="space-y-6">
                  <div className="flex gap-4 p-4 rounded-xl bg-card border border-border">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
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

                  <div className="flex gap-4 p-4 rounded-xl bg-card border border-border">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
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
              </div>

              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent rounded-3xl blur-2xl" />
                <div className="relative p-8 rounded-2xl bg-card border border-border">
                  <div className="flex items-center gap-3 mb-6">
                    <Landmark className="w-6 h-6 text-primary" />
                    <span className="font-semibold">Flux financier sécurisé</span>
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
                        <div className={`p-3 rounded-lg ${item.highlight ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/50'}`}>
                          <span className={`text-sm ${item.highlight ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                            {item.label}
                          </span>
                        </div>
                        {item.arrow && (
                          <div className="flex justify-center py-2">
                            <div className="w-px h-4 bg-border" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {countries.map((country, index) => (
                <motion.div
                  key={country.code}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-300 text-center"
                >
                  <div className="text-5xl mb-4">{country.flag}</div>
                  <h3 className="font-semibold mb-1">{country.name}</h3>
                  <p className="text-sm text-muted-foreground">{country.region}</p>
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-success">
                    <CheckCircle2 className="w-3 h-3" />
                    Partenaire actif
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
