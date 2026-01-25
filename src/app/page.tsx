"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
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
  Landmark,
  Package
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
          {/* Dynamic Background with World Map Hint */}
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black" />

            {/* World Map Watermark */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg')] bg-center bg-no-repeat bg-cover grayscale contrast-200" style={{ filter: 'invert(1)' }} />

            {/* Network Connections */}
            <motion.div
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-[linear-gradient(45deg,transparent_45%,rgba(197,160,89,0.05)_50%,transparent_55%)] bg-[length:200%_200%]"
            />

            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 flex flex-col items-center text-center">

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="mb-12 max-w-5xl"
            >
              {/* BRANDING */}
              <div className="mb-8">
                <span className="text-sm font-medium tracking-widest text-gold/80 uppercase">Une filiale du Groupe A.Onoseke House Investment RDC</span>
                <div className="h-0.5 w-24 bg-gold/50 mx-auto mt-2" />
              </div>

              {/* TITRE PRINCIPAL (H1) */}
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-white uppercase leading-tight">
                LA PASSERELLE SÉCURISÉE ENTRE <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400">KINSHASA</span> ET LES <br />
                <span className="text-gradient-gold">GÉANTS ÉCONOMIQUES MONDIAUX</span>
              </h1>

              {/* SOUS-TITRE (H2) */}
              <h2 className="text-lg sm:text-xl lg:text-2xl text-gray-400 font-light mb-10 max-w-3xl mx-auto">
                <strong className="text-white font-normal">Facilitation d'Achats • Sourcing Stratégique • Importation de Précision</strong>
                <span className="text-sm mt-4 block text-gray-500">
                  Accédez aux meilleurs fournisseurs de <span className="text-white">Chine, Dubaï (UAE), Turquie, Thaïlande et Japon</span> sans les risques liés à la distance.
                </span>
              </h2>

              {/* BOUTON D'ACTION (CTA) - Royal Blue */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Button size="lg" asChild className="h-16 px-12 text-lg bg-[#0033A0] hover:bg-[#002a85] text-white transition-all duration-300 shadow-[0_0_30px_-5px_rgba(0,51,160,0.4)] hover:shadow-[0_0_40px_-5px_rgba(0,51,160,0.6)] hover:-translate-y-1 rounded-full uppercase font-bold tracking-widest">
                  <Link href="/register">
                    LANCER MON IMPORTATION
                  </Link>
                </Button>
              </div>
            </motion.div>

            {/* Flag Strip (Juste en dessous du titre comme demandé) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex items-center gap-6 opacity-80 grayscale-[30%] hover:grayscale-0 transition-all duration-500 mt-8"
            >
              {['🇨🇳', '🇦🇪', '🇹🇷', '🇹🇭', '🇯🇵'].map((flag, i) => (
                <span key={i} className="text-3xl sm:text-4xl drop-shadow-md cursor-help hover:scale-110 transition-transform" title="Pays Partenaire">{flag}</span>
              ))}
            </motion.div>
          </div>
        </section>

        {/* SECTION 2 : LA PROMESSE */}
        <section className="py-32 relative bg-black">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-4xl mx-auto mb-20">
              <h2 className="text-3xl sm:text-5xl font-bold mb-8 uppercase tracking-wide text-white">
                IMPORTATION <span className="text-gold">5 ÉTOILES</span>, SANS FRONTIÈRES.
              </h2>
              <p className="text-xl text-gray-400 leading-relaxed font-light">
                Alpha Import Exchange redéfinit les standards de l'importation en RDC.
                Adossés à la solidité financière du <span className="text-white font-medium">Groupe A.Onoseke House Investment</span>,
                nous ne sommes pas de simples transitaires. <strong>Nous sommes votre partenaire d'achat global.</strong>
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* 1. Sécurisation Financière */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="p-8 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:border-gold/20 transition-all group"
              >
                <div className="w-16 h-16 rounded-xl bg-gold/10 flex items-center justify-center mb-6 text-gold group-hover:scale-110 transition-transform">
                  <Shield className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4 uppercase">1. Sécurisation Financière</h3>
                <p className="text-gray-400 leading-relaxed">
                  Vos fonds sont protégés. Nous gérons le paiement de vos fournisseurs pour éviter les arnaques et les blocages bancaires.
                </p>
              </motion.div>

              {/* 2. Hubs Stratégiques */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="p-8 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:border-gold/20 transition-all group lg:col-span-1"
              >
                <div className="w-16 h-16 rounded-xl bg-gold/10 flex items-center justify-center mb-6 text-gold group-hover:scale-110 transition-transform">
                  <Globe2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-6 uppercase">2. Hubs Stratégiques Ciblés</h3>
                <div className="space-y-6">
                  {/* UAE - Real Partner */}
                  <div className="p-4 rounded-xl bg-white/5 border border-gold/30 flex items-start gap-4 hover:bg-white/10 transition-colors cursor-default">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white shrink-0 shadow-lg">
                      <Image
                        src="/partners/maarmala.jpg"
                        alt="MAARMALA UAE"
                        fill
                        className="object-contain p-1"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">🇦🇪</span>
                        <span className="font-bold text-white text-sm">MAARMALA (UAE)</span>
                      </div>
                      <p className="text-xs text-gold mb-1 font-medium tracking-wide">Partenaire Officiel</p>
                      <p className="text-xs text-gray-400">M. BILONGO ACHIGNON</p>
                      <p className="text-xs text-gray-400 font-mono">+971 50 120 1719</p>
                    </div>
                  </div>

                  {/* Others - Coming Soon */}
                  <ul className="space-y-3 text-sm text-gray-400">
                    <li className="flex items-center gap-3 opacity-60">
                      <span className="text-xl">🇨🇳</span>
                      <span><strong className="text-white">CHINE</strong> <span className="text-[10px] uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-full ml-2 text-gray-500">Bientôt</span></span>
                    </li>
                    <li className="flex items-center gap-3 opacity-60">
                      <span className="text-xl">🇹🇷</span>
                      <span><strong className="text-white">TURQUIE</strong> <span className="text-[10px] uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-full ml-2 text-gray-500">Bientôt</span></span>
                    </li>
                    <li className="flex items-center gap-3 opacity-60">
                      <span className="text-xl">🇹🇭</span>
                      <span><strong className="text-white">THAÏLANDE</strong> <span className="text-[10px] uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-full ml-2 text-gray-500">Bientôt</span></span>
                    </li>
                    <li className="flex items-center gap-3 opacity-60">
                      <span className="text-xl">🇯🇵</span>
                      <span><strong className="text-white">JAPON</strong> <span className="text-[10px] uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-full ml-2 text-gray-500">Bientôt</span></span>
                    </li>
                  </ul>
                </div>
              </motion.div>

              {/* 3. Logistique de Bout en Bout */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="p-8 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:border-gold/20 transition-all group"
              >
                <div className="w-16 h-16 rounded-xl bg-gold/10 flex items-center justify-center mb-6 text-gold group-hover:scale-110 transition-transform">
                  <Package className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4 uppercase">3. Logistique de Bout en Bout</h3>
                <p className="text-gray-400 leading-relaxed">
                  Du sourcing à l'entrepôt du fournisseur jusqu'à votre porte à Kinshasa.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* SECTION 3 : COMMENT ÇA MARCHE ? */}
        <section className="py-32 bg-[#050505] relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold mb-16 font-mono text-gold tracking-widest uppercase">
              // COMMENT ÇA MARCHE ?
            </h2>

            <div className="grid md:grid-cols-3 gap-12 relative">
              {/* Connecting Line */}
              <div className="hidden md:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              {[
                { number: "01", title: "IDENTIFIEZ", text: "Dites-nous ce que vous cherchez ou envoyez-nous votre facture proforma.", icon: Eye },
                { number: "02", title: "PAYEZ EN LOCAL", text: "Réglez en toute sécurité à Kinshasa. Nous nous occupons du change et du transfert international.", icon: Lock },
                { number: "03", title: "RÉCEPTIONNEZ", text: "Suivez votre cargo en temps réel et recevez vos marchandises dédouanées.", icon: CheckCircle2 }
              ].map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  className="relative bg-black border border-white/10 p-8 rounded-xl hover:border-gold/30 transition-colors"
                >
                  {/* Golden Icon on Black Background */}
                  <div className="w-20 h-20 mx-auto bg-black border-2 border-gold/50 rounded-full flex items-center justify-center mb-6 relative z-10 shadow-[0_0_20px_rgba(197,160,89,0.2)]">
                    <step.icon className="w-8 h-8 text-gold" />
                  </div>
                  <div className="text-5xl font-bold text-white/5 absolute top-4 right-6 pointer-events-none">{step.number}</div>
                  <h3 className="text-xl font-bold text-white mb-4 tracking-wider uppercase">{step.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    "{step.text}"
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="mt-20">
              <Button size="lg" asChild className="h-14 px-10 text-base bg-[#0033A0] hover:bg-[#002a85] text-white rounded-full uppercase tracking-wider font-bold shadow-lg shadow-blue-900/20">
                <Link href="/register">
                  Démarrer maintenant
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
