"use client"

import { motion } from "framer-motion"
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
  Scale
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
    details: [
      "Pays source (Chine, Émirats, Turquie, Thaïlande)",
      "Catégorie de produit",
      "Spécifications, quantités, budget"
    ]
  },
  {
    number: "03",
    title: "Validation et devis Alpha",
    description: "Notre équipe analyse votre demande et vous propose un devis détaillé avec délais et garanties.",
    icon: BadgeCheck,
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
    details: [
      "Fonds 100% sécurisés",
      "Aucun décaissement sans validation",
      "Traçabilité complète"
    ]
  },
  {
    number: "05",
    title: "Sourcing par partenaire certifié",
    description: "Notre partenaire local exclusif source les produits, négocie les prix et contrôle la qualité.",
    icon: Factory,
    details: [
      "Partenaire sous contrat",
      "Contrôle qualité sur place",
      "Photos et vidéos de validation"
    ]
  },
  {
    number: "06",
    title: "Expédition internationale",
    description: "Logistique complète avec documentation douanière, assurance et tracking en temps réel.",
    icon: Ship,
    details: [
      "Documents d'expédition",
      "Assurance marchandise",
      "Suivi GPS"
    ]
  },
  {
    number: "07",
    title: "Livraison et paiement solde",
    description: "Confirmez la réception, payez les 40% restants. Le dossier est clôturé.",
    icon: CheckCircle2,
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
  return (
    <div className="min-h-screen">
      <PublicHeader />
      
      <main className="pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 text-left">
          <BackButton />
        </div>
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 pattern-grid opacity-20" />
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-8">
                <Shield className="w-4 h-4" />
                Processus sécurisé
              </div>
              
              <h1 className="text-4xl sm:text-5xl font-bold mb-6">
                Comment ça <span className="text-gradient-gold">marche</span> ?
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Un processus en 7 étapes, transparent et sécurisé. De votre demande 
                jusqu&apos;à la livraison, Alpha contrôle tout.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-16 relative">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-8">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="relative"
                >
                  <div className="flex gap-6 items-start">
                    <div className="hidden sm:flex flex-col items-center">
                      <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center shrink-0">
                        <step.icon className="w-7 h-7 text-primary" />
                      </div>
                      {index < steps.length - 1 && (
                        <div className="w-px h-24 bg-gradient-to-b from-border to-transparent mt-4" />
                      )}
                    </div>

                    <div className="flex-1 p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">
                          {step.number}
                        </span>
                        <h3 className="text-xl font-semibold">{step.title}</h3>
                      </div>
                      <p className="text-muted-foreground mb-4">{step.description}</p>
                      <ul className="space-y-2">
                        {step.details.map((detail, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 bg-card/50 relative">
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
                  className="p-6 rounded-2xl bg-card border border-border"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <guarantee.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{guarantee.title}</h3>
                  <p className="text-sm text-muted-foreground">{guarantee.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 relative">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="p-8 rounded-2xl bg-card border border-border">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">En cas d&apos;incident</h3>
                  <p className="text-muted-foreground">
                    Alpha Import Exchange dispose de mécanismes de protection à plusieurs niveaux.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: "Assurance marchandise", desc: "Couverture selon axe logistique" },
                  { label: "Caution partenaire", desc: "Dépôt de garantie obligatoire" },
                  { label: "Fonds de réserve", desc: "Capital de sécurité Alpha" },
                  { label: "Arbitrage Admin", desc: "Décision finale et exécutoire" },
                ].map((item, index) => (
                  <div key={index} className="p-4 rounded-xl bg-secondary/30">
                    <p className="font-medium mb-1">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-gradient-to-br from-primary/10 via-background to-background">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-6">
              Prêt à commencer ?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Créez votre compte gratuitement et lancez votre première demande d&apos;importation 
              en quelques minutes.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="h-14 px-8 group glow-gold">
                <Link href="/register" className="flex items-center gap-2">
                  Créer un compte
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-14 px-8">
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
