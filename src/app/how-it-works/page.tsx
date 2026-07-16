"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import {
  FileCheck,
  Wallet,
  Factory,
  Ship,
  CheckCircle2,
  Shield,
  Lock,
  Eye,
  Users,
  AlertTriangle,
  BadgeCheck,
  Scale,
  Truck,
  Box,
  Globe,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"
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
  { icon: Lock, title: "Fonds séquestrés", description: "Vos paiements sont bloqués jusqu'à chaque étape validée. Aucun décaissement direct." },
  { icon: Eye, title: "Traçabilité totale", description: "Chaque action est horodatée et documentée. Audit trail complet." },
  { icon: Shield, title: "Arbitrage Alpha", description: "En cas d'incident, Alpha intervient avec assurance et compensation." },
  { icon: Scale, title: "Contrat partenaire", description: "Chaque partenaire est sous contrat exclusif avec caution déposée." },
]

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen" style={{ background: "hsl(216 45% 6%)" }}>
      <PublicHeader />

      <main className="pt-20 overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-6 pt-8">
          <BackButton href="/" className="text-white/50 hover:text-gold" />
        </div>

        {/* Hero */}
        <section className="relative py-32 overflow-hidden">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full" style={{ background: "hsl(42 85% 55% / 0.08)", filter: "blur(80px)" }} />
          <div className="absolute inset-0 diagonal-lines opacity-15 pointer-events-none" />
          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-condensed text-xs text-gold tracking-[0.3em] uppercase mb-8 border border-gold/30" style={{ background: "hsl(42 85% 55% / 0.08)" }}>
                <Shield className="w-4 h-4" />
                Confiance & Sécurité Garantie
              </div>

              <h1 className="font-display text-[14vw] md:text-[10vw] lg:text-[8vw] text-white leading-none mb-8">
                Comment ça <span className="text-gradient-gold">marche</span> ?
              </h1>
              <p className="font-sans text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
                Un processus en 7 étapes, transparent et sécurisé. De votre demande jusqu&apos;à la livraison, Alpha contrôle chaque détail.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Steps */}
        <section className="relative py-16">
          <div className="absolute inset-0 diagonal-lines opacity-10 pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="space-y-32">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 items-center`}
                >
                  <div className="flex-1 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "hsl(42 85% 55% / 0.1)" }}>
                        <step.icon className="w-8 h-8 text-gold" />
                      </div>
                      <span className="font-display text-5xl text-gold/30">{step.number}</span>
                    </div>
                    <div>
                      <h3 className="font-display text-4xl text-white mb-4">{step.title}</h3>
                      <p className="font-sans text-lg text-white/50 leading-relaxed mb-6">{step.description}</p>
                      <div className="grid sm:grid-cols-1 gap-3">
                        {step.details.map((detail, idx) => (
                          <div key={idx} className="flex items-center gap-3 font-sans text-sm text-white/40 p-3 rounded-xl border border-white/10" style={{ background: "hsl(216 40% 9% / 0.5)" }}>
                            <CheckCircle2 className="w-5 h-5 text-gold shrink-0" />
                            {detail}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 w-full relative group">
                    <div className="absolute -inset-4 rounded-[2.5rem] opacity-50 transition-opacity duration-500 group-hover:opacity-70" style={{ background: "hsl(42 85% 55% / 0.15)", filter: "blur(40px)" }} />
                    <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl">
                      <Image src={step.image} alt={step.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#06101e]/60 via-transparent to-transparent" />
                      <div className="absolute bottom-6 left-6">
                        <div className="inline-flex items-center gap-2 font-condensed text-xs text-gold tracking-[0.2em] uppercase px-3 py-1 rounded-full border border-gold/30" style={{ background: "hsl(42 85% 55% / 0.1)", backdropFilter: "blur(12px)" }}>
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

        {/* Trust Infrastructure */}
        <section className="relative py-32 overflow-hidden border-t border-white/5">
          <div className="absolute inset-0 diagonal-lines opacity-15 pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
                <p className="font-condensed text-xs text-gold tracking-[0.5em] uppercase mb-4">Infrastructure</p>
                <h2 className="font-display text-[12vw] md:text-[8vw] lg:text-[7vw] text-white leading-none mb-8">
                  Une <span className="text-gradient-gold">Infrastructure</span> de Confiance
                </h2>
                <p className="font-sans text-lg text-white/50 leading-relaxed mb-10">
                  Nous ne sommes pas qu&apos;une plateforme digitale. Nous disposons d&apos;entrepôts, d&apos;experts en transport et d&apos;un réseau de partenaires physiques présents sur le terrain.
                </p>
                <div className="space-y-4">
                  {[
                    { icon: Box, title: "Gestion des Stocks", desc: "Contrôle physique et entreposage sécurisé avant expédition." },
                    { icon: Truck, title: "Logistique & Transport", desc: "Réseau multimodal air/mer avec suivi GPS en temps réel." },
                    { icon: Globe, title: "Présence Globale", desc: "Bureaux et partenaires certifiés en Chine, Émirats, Turquie, Thaïlande et Japon." },
                  ].map((item, i) => (
                    <div key={i} className="group flex gap-4 p-4 rounded-2xl border border-white/10 hover:border-gold/30 transition-colors" style={{ background: "hsl(216 40% 9% / 0.3)" }}>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(42 85% 55% / 0.1)" }}>
                        <item.icon className="w-6 h-6 text-gold" />
                      </div>
                      <div>
                        <h4 className="font-display text-white text-lg mb-1">{item.title}</h4>
                        <p className="font-sans text-sm text-white/40">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="relative aspect-square lg:aspect-auto lg:h-[600px] rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl">
                <Image src="https://images.unsplash.com/photo-1580674285054-bed31e145f59?auto=format&fit=crop&q=80&w=800" alt="Infrastructure Alpha" fill className="object-cover" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top right, hsl(42 85% 55% / 0.3), transparent)" }} />
                <div className="absolute bottom-10 left-10 right-10 p-8 rounded-[2rem] border border-white/20" style={{ background: "rgba(6,16,30,0.7)", backdropFilter: "blur(20px)" }}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "hsl(42 85% 55% / 0.2)" }}>
                      <Shield className="w-6 h-6 text-gold" />
                    </div>
                    <div>
                      <p className="font-display text-white text-lg">Confiance Maximale</p>
                      <p className="font-condensed text-xs text-white/40 tracking-widest uppercase">Zéro risque acheteur</p>
                    </div>
                  </div>
                  <p className="font-sans text-sm text-white/70 italic">
                    &quot;Notre priorité est la sécurité de vos fonds et la conformité de vos marchandises.&quot;
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Guarantees */}
        <section className="relative py-32 overflow-hidden border-t border-white/5">
          <div className="absolute inset-0 diagonal-lines opacity-15 pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
                <p className="font-condensed text-xs text-gold tracking-[0.5em] uppercase mb-4">Sécurité</p>
                <h2 className="font-display text-[12vw] md:text-[8vw] lg:text-[7vw] text-white leading-none">
                  Nos <span className="text-gradient-gold">garanties</span>
                </h2>
              </motion.div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {guarantees.map((g, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: index * 0.1 }}
                  className="group relative p-8 rounded-2xl border border-white/10 hover:border-gold/30 transition-all"
                  style={{ background: "hsl(216 40% 9% / 0.3)" }}
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform" style={{ background: "hsl(42 85% 55% / 0.1)" }}>
                    <g.icon className="w-7 h-7 text-gold" />
                  </div>
                  <h3 className="font-display text-2xl text-white mb-3">{g.title}</h3>
                  <p className="font-sans text-sm text-white/40 leading-relaxed">{g.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Incident Handling */}
        <section className="relative py-24 overflow-hidden border-t border-white/5">
          <div className="max-w-4xl mx-auto px-6 relative z-10">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="relative p-10 rounded-[2.5rem] border border-white/10 overflow-hidden" style={{ background: "hsl(216 40% 9% / 0.4)" }}>
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full -mr-32 -mt-32" style={{ background: "hsl(38 75% 42% / 0.15)", filter: "blur(80px)" }} />

              <div className="flex items-start gap-6 mb-8 relative">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "hsl(38 75% 42% / 0.2)" }}>
                  <AlertTriangle className="w-8 h-8" style={{ color: "hsl(38 75% 42%)" }} />
                </div>
                <div>
                  <h3 className="font-display text-3xl text-white mb-3">En cas d&apos;incident</h3>
                  <p className="font-sans text-lg text-white/50">Alpha Import Exchange RDC dispose de mécanismes de protection à plusieurs niveaux.</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 relative">
                {[
                  { label: "Assurance marchandise", desc: "Couverture selon axe logistique" },
                  { label: "Caution partenaire", desc: "Dépôt de garantie obligatoire" },
                  { label: "Fonds de réserve", desc: "Capital de sécurité Alpha" },
                  { label: "Arbitrage Admin", desc: "Décision finale et exécutoire" },
                ].map((item, index) => (
                  <div key={index} className="group p-5 rounded-2xl border border-white/10 transition-colors hover:border-gold/20" style={{ background: "hsl(216 40% 9% / 0.3)" }}>
                    <p className="font-display text-lg text-white mb-1 group-hover:text-gold transition-colors">{item.label}</p>
                    <p className="font-sans text-sm text-white/40">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative py-32 overflow-hidden border-t border-white/5">
          <div className="absolute inset-0 diagonal-lines opacity-15 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full" style={{ background: "hsl(42 85% 55% / 0.06)", filter: "blur(100px)" }} />
          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
              <h2 className="font-display text-[12vw] md:text-[8vw] lg:text-[7vw] text-white leading-none mb-8">
                Prêt à <span className="text-gradient-gold">commencer</span> ?
              </h2>
              <p className="font-sans text-lg text-white/50 max-w-2xl mx-auto mb-12">
                Créez votre compte gratuitement et lancez votre première demande d&apos;importation en toute sérénité.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Link href="/register" className="font-condensed text-sm font-bold px-12 py-5 bg-gold text-[#06101e] hover:bg-[hsl(44_90%_65%)] transition-all duration-200 tracking-[0.3em] uppercase glow-gold inline-flex items-center gap-2 group">
                  Créer un compte
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/contact" className="font-condensed text-sm px-12 py-5 border border-white/25 text-white/80 hover:border-gold hover:text-gold transition-all duration-200 tracking-[0.3em] uppercase">
                  Nous contacter
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
