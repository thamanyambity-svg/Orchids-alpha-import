"use client"

import Image from "next/image"
import { motion, useScroll, useTransform } from "framer-motion"
import { 
  FileCheck, 
  Wallet, 
  Factory, 
  Ship, 
  CheckCircle2, 
  Shield,
  ArrowRight,
  Lock,
  Eye,
  Users,
  AlertTriangle,
  BadgeCheck,
  Scale,
  Truck,
  Box,
  Globe
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BackButton } from "@/components/back-button"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"

const steps = [
  {
    number: "01",
    title: "Créez votre compte Acheteur",
    description: "Inscription gratuite en quelques minutes. Validez votre email et téléphone pour activer votre espace.",
    icon: Users,
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800",
    details: [
      "Nom, email, téléphone",
      "Validation OTP",
      "Accès immédiat au dashboard"
    ]
  },
  {
    number: "02",
    title: "Formulez votre demande d'importation",
    description: "Décrivez précisément votre besoin via notre formulaire intelligent adapté à chaque pays et catégorie.",
    icon: FileCheck,
    image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800",
      details: [
        "Pays source (Chine, Émirats, Turquie, Thaïlande, Japon)",
        "Catégorie de produit",
        "Spécifications, quantités, budget"
      ]
  },
  {
    number: "03",
    title: "Validation et devis Alpha",
    description: "Notre équipe analyse votre demande et vous propose un devis détaillé avec délais et garanties.",
    icon: BadgeCheck,
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=800",
    details: [
      "Analyse de faisabilité",
      "Devis transparent",
      "Délai estimé de livraison"
    ]
  },
  {
    number: "04",
    title: "Paiement 60% sécurisé",
    description: "Payez l'acompte de 60%. Vos fonds sont bloqués sur notre compte séquestre jusqu'à validation.",
    icon: Wallet,
    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=800",
    details: [
      "Fonds 100% sécurisés",
      "Aucun décaissement sans validation",
      "Traçabilité complète"
    ]
  },
  {
    number: "05",
    title: "Sourcing et Gestion des Stocks",
    description: "Notre partenaire local exclusif source les produits, négocie les prix et contrôle la qualité dans nos entrepôts.",
    icon: Factory,
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800",
    details: [
      "Partenaire sous contrat",
      "Contrôle qualité sur place",
      "Photos et vidéos de validation"
    ]
  },
  {
    number: "06",
    title: "Expédition et Transport",
    description: "Logistique complète avec documentation douanière, assurance et tracking en temps réel par mer ou air.",
    icon: Ship,
    image: "https://images.unsplash.com/photo-1494412519320-aa613dfb7738?auto=format&fit=crop&q=80&w=800",
    details: [
      "Documents d'expédition",
      "Assurance marchandise",
      "Suivi GPS"
    ]
  },
  {
    number: "07",
    title: "Livraison Finale et Clôture",
    description: "Confirmez la réception à votre adresse, payez les 40% restants. Le dossier est clôturé.",
    icon: CheckCircle2,
    image: "https://images.unsplash.com/photo-1566576721346-d4a3b4eaad5b?auto=format&fit=crop&q=80&w=800",
    details: [
      "Confirmation de réception",
      "Paiement solde 40%",
      "Archivage documents"
    ]
  }
]

const guarantees = [
  {
    icon: Lock,
    title: "Fonds séquestrés",
    description: "Vos paiements sont bloqués jusqu'à chaque étape validée. Aucun décaissement direct."
  },
  {
    icon: Eye,
    title: "Traçabilité totale",
    description: "Chaque action est horodatée et documentée. Audit trail complet."
  },
  {
    icon: Shield,
    title: "Arbitrage Alpha",
    description: "En cas d'incident, Alpha intervient avec assurance et compensation."
  },
  {
    icon: Scale,
    title: "Contrat partenaire",
    description: "Chaque partenaire est sous contrat exclusif avec caution déposée."
  }
]

export default function HowItWorksPage() {
  const { scrollYProgress } = useScroll()
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.1])

  return (
    <div className="min-h-screen">
      <PublicHeader />
      
      <main className="pt-20 overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 text-left">
          <BackButton href="/" />
        </div>

        {/* Hero Section with Animation */}
        <section className="py-24 relative overflow-hidden">
          <motion.div 
            style={{ scale }}
            className="absolute inset-0 pattern-grid opacity-20" 
          />
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-8">
                <Shield className="w-4 h-4" />
                Confiance & Sécurité Garantie
              </div>
              
              <h1 className="text-5xl sm:text-7xl font-bold mb-6 tracking-tight">
                Comment ça <span className="text-gradient-gold">marche</span> ?
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Un processus en 7 étapes, transparent et sécurisé. De votre demande 
                jusqu&apos;à la livraison, Alpha contrôle chaque détail.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Steps with Images - Alternating Layout */}
        <section className="py-16 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-32">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 items-center`}
                >
                  {/* Text Side */}
                  <div className="flex-1 space-y-6">
                    <div className="inline-flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <step.icon className="w-8 h-8 text-primary" />
                      </div>
                      <span className="text-4xl font-mono text-primary/30 font-bold">
                        {step.number}
                      </span>
                    </div>
                    
                    <div>
                      <h3 className="text-3xl font-bold mb-4">{step.title}</h3>
                      <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                        {step.description}
                      </p>
                      
                      <div className="grid sm:grid-cols-1 gap-3">
                        {step.details.map((detail, idx) => (
                          <motion.div 
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + (idx * 0.1) }}
                            className="flex items-center gap-3 text-muted-foreground bg-secondary/30 p-3 rounded-xl border border-border/50"
                          >
                            <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                            <span className="text-sm font-medium">{detail}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Image Side */}
                  <div className="flex-1 w-full relative group">
                    <div className="absolute -inset-4 bg-primary/20 rounded-[2.5rem] blur-2xl group-hover:bg-primary/30 transition-colors duration-500 opacity-50" />
                    <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden border border-border shadow-2xl">
                      <Image
                        src={step.image}
                        alt={step.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-6 left-6 text-white">
                        <div className="flex items-center gap-2 text-xs font-mono bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                          <Eye className="w-3 h-3" />
                          Inspection Alpha
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust & Infrastructure Section */}
        <section className="py-32 bg-secondary/30 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-4xl font-bold mb-6">
                  Une <span className="text-gradient-gold">Infrastructure</span> de Confiance
                </h2>
                <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
                  Nous ne sommes pas qu&apos;une plateforme digitale. Nous disposons d&apos;entrepôts, 
                  d&apos;experts en transport et d&apos;un réseau de partenaires physiques 
                  présents sur le terrain.
                </p>

                <div className="space-y-6">
                  {[
                    { icon: Box, title: "Gestion des Stocks", desc: "Contrôle physique et entreposage sécurisé avant expédition." },
                    { icon: Truck, title: "Logistique & Transport", desc: "Réseau multimodal air/mer avec suivi GPS en temps réel." },
                      { icon: Globe, title: "Présence Globale", desc: "Bureaux et partenaires certifiés en Chine, Émirats, Turquie, Thaïlande et Japon." },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <item.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-bold mb-1">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="relative aspect-square lg:aspect-auto lg:h-[600px] rounded-[3rem] overflow-hidden border border-border shadow-2xl"
              >
                <Image
                  src="https://images.unsplash.com/photo-1580674285054-bed31e145f59?auto=format&fit=crop&q=80&w=800"
                  alt="Infrastructure Alpha"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/40 to-transparent" />
                <div className="absolute bottom-10 left-10 right-10 p-8 rounded-[2rem] bg-white/10 backdrop-blur-xl border border-white/20">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gold-gradient p-[1px]">
                      <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                        <Shield className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                    <div>
                      <p className="text-white font-bold">Confiance Maximale</p>
                      <p className="text-white/60 text-sm">Zéro risque acheteur</p>
                    </div>
                  </div>
                  <p className="text-white/90 text-sm italic">
                    &quot;Notre priorité est la sécurité de vos fonds et la conformité de vos marchandises.&quot;
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Guarantees Grid */}
        <section className="py-24 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-bold mb-4">
                Nos <span className="text-gradient-gold">garanties</span>
              </h2>
              <p className="text-muted-foreground">
                Chaque aspect de la plateforme est conçu pour éliminer les risques.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {guarantees.map((guarantee, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="p-8 rounded-2xl bg-card border border-border hover:shadow-xl transition-all hover:-translate-y-1"
                >
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                    <guarantee.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-3">{guarantee.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{guarantee.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Incident Handling */}
        <section className="py-24 relative">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="p-10 rounded-[2.5rem] bg-card border border-border relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-warning/5 rounded-full blur-3xl -mr-32 -mt-32" />
              
              <div className="flex items-start gap-6 mb-8 relative">
                <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center shrink-0 shadow-lg shadow-warning/10">
                  <AlertTriangle className="w-8 h-8 text-warning" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-3">En cas d&apos;incident</h3>
                  <p className="text-muted-foreground text-lg">
                    Alpha Import Exchange RDC dispose de mécanismes de protection à plusieurs niveaux.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 relative">
                {[
                  { label: "Assurance marchandise", desc: "Couverture selon axe logistique" },
                  { label: "Caution partenaire", desc: "Dépôt de garantie obligatoire" },
                  { label: "Fonds de réserve", desc: "Capital de sécurité Alpha" },
                  { label: "Arbitrage Admin", desc: "Décision finale et exécutoire" },
                ].map((item, index) => (
                  <div key={index} className="p-5 rounded-2xl bg-secondary/30 border border-border/50 group hover:bg-secondary/50 transition-colors">
                    <p className="font-bold mb-1 group-hover:text-primary transition-colors">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5" />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl sm:text-5xl font-bold mb-8">
              Prêt à commencer ?
            </h2>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              Créez votre compte gratuitement et lancez votre première demande d&apos;importation 
              en toute sérénité.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Button size="lg" asChild className="h-16 px-10 text-lg group glow-gold rounded-full">
                <Link href="/register" className="flex items-center gap-2">
                  Créer un compte
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-16 px-10 text-lg rounded-full">
                <Link href="/contact">
                  Nous contacter
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
