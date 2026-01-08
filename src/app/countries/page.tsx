"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Globe, 
  ChevronRight, 
  TrendingUp, 
  ShieldCheck, 
  Zap,
  Building2,
  Ship,
  Factory,
  CheckCircle2,
  ArrowRight
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { BackButton } from "@/components/back-button"

const countries = [
  {
    id: "china",
    name: "Chine",
    title: "L'Usine du Monde",
    description: "La Chine demeure le partenaire incontournable pour le sourcing industriel et technologique. Avec une infrastructure de production inégalée, elle offre des opportunités de personnalisation massives à des prix compétitifs.",
    advantages: [
      "Capacité de production illimitée",
      "Écosystème technologique avancé",
      "Rapport qualité-prix imbattable",
      "Innovation et réactivité industrielle"
    ],
    specialties: "Électronique, Machines, Textile, High-Tech",
    image: "https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?auto=format&fit=crop&q=80&w=1200",
    flag: "🇨🇳",
    stats: { growth: "+12%", partners: "450+" }
  },
  {
    id: "turkey",
    name: "Turquie",
    title: "Le Pont entre l'Europe et l'Asie",
    description: "La Turquie s'impose comme une alternative de choix pour des produits de qualité européenne avec des délais de livraison réduits. C'est le hub privilégié pour le textile et les matériaux de construction.",
    advantages: [
      "Qualité aux normes européennes",
      "Délais de livraison courts",
      "Savoir-faire artisanal et industriel",
      "Coûts logistiques optimisés"
    ],
    specialties: "Textile, Ameublement, Construction, Automobile",
    image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&q=80&w=1200",
    flag: "🇹🇷",
    stats: { growth: "+8%", partners: "280+" }
  },
  {
    id: "uae",
    name: "Émirats Arabes Unis",
    title: "Le Carrefour Logistique Mondial",
    description: "Dubaï est la plaque tournante du commerce international. Sa zone franche et ses infrastructures portuaires permettent un transit ultra-rapide pour les produits à haute valeur ajoutée.",
    advantages: [
      "Zéro taxe à l'exportation",
      "Hub logistique de classe mondiale",
      "Rapidité de traitement douanier",
      "Accès aux marques internationales"
    ],
    specialties: "Luxe, Cosmétiques, Électronique, Trading",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=1200",
    flag: "🇦🇪",
    stats: { growth: "+15%", partners: "320+" }
  },
  {
    id: "thailand",
    name: "Thaïlande",
    title: "L'Excellence d'Asie du Sud-Est",
    description: "Reconnue pour sa rigueur et sa qualité manufacturière, la Thaïlande est le partenaire stratégique pour l'agroalimentaire et les pièces techniques de haute précision.",
    advantages: [
      "Standards sanitaires rigoureux",
      "Excellence manufacturière",
      "Stabilité des approvisionnements",
      "Expertise technique reconnue"
    ],
      specialties: "Agroalimentaire, Pièces Détachées, Bijouterie",
      image: "https://images.unsplash.com/photo-1528181304800-2f140819ad1c?auto=format&fit=crop&q=80&w=1200",
      flag: "🇹🇭",
      stats: { growth: "+6%", partners: "150+" }
    },
  {
    id: "japan",
    name: "Japon",
    title: "L'Excellence Technologique",
    description: "Le Japon est le partenaire de référence pour la haute technologie et l'ingénierie de précision. Sa culture de la perfection garantit des produits d'une fiabilité exceptionnelle.",
    advantages: [
      "Innovation technologique de pointe",
      "Qualité de fabrication irréprochable",
      "Fiabilité et durabilité extrêmes",
      "Design industriel de précision"
    ],
    specialties: "Robotique, Électronique, Automobile, Machines-outils",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&q=80&w=1200",
    flag: "🇯🇵",
    stats: { growth: "+5%", partners: "110+" }
  }
]

export default function CountriesPage() {
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % countries.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen">
      <PublicHeader />
      
      <main className="pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <BackButton href="/" />
        </div>

        {/* Hero Section with Rotating Gallery */}
        <section className="relative h-[600px] mt-8 overflow-hidden">
          <AnimatePresence mode="wait">
            {countries[currentSlide] && (
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                className="absolute inset-0"
              >
                <Image
                  src={countries[currentSlide].image}
                  alt={countries[currentSlide].name}
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                
                <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="max-w-2xl"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <span className="text-4xl">{countries[currentSlide].flag}</span>
                      <span className="text-primary font-bold tracking-widest uppercase">Pays Partenaire</span>
                    </div>
                    <h1 className="text-5xl sm:text-7xl font-bold text-white mb-6">
                      {countries[currentSlide].name}
                    </h1>
                    <p className="text-xl text-white/80 mb-8 leading-relaxed">
                      {countries[currentSlide].title}. {countries[currentSlide].description}
                    </p>
                    <Button size="lg" className="h-14 px-8 text-lg glow-gold" asChild>
                      <Link href="/register">
                        Sourcing {countries[currentSlide].name}
                        <ArrowRight className="ml-2 w-5 h-5" />
                      </Link>
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Slide Indicators */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-3">
            {countries.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-12 h-1.5 rounded-full transition-all duration-500 ${
                  currentSlide === index ? "bg-primary w-24" : "bg-white/30"
                }`}
              />
            ))}
          </div>
        </section>

        {/* Features / Benefits */}
        <section className="py-24 bg-secondary/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">Pourquoi choisir nos <span className="text-gradient-gold">Pays Partenaires</span> ?</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Chaque destination est sélectionnée pour ses avantages économiques uniques et sa fiabilité en matière de resourcing mondial.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: TrendingUp,
                  title: "Avantages Économiques",
                  desc: "Accès direct aux prix d'usine et optimisation fiscale via nos hubs partenaires."
                },
                {
                  icon: ShieldCheck,
                  title: "Qualité Certifiée",
                  desc: "Présence physique sur place pour contrôler chaque lot avant expédition."
                },
                {
                  icon: Zap,
                  title: "Rapidité & Logistique",
                  desc: "Réseaux de transport optimisés pour des délais de livraison records."
                }
              ].map((feature, i) => (
                <div key={i} className="p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Detailed Country Sections */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-32">
              {countries.map((country, index) => (
                <div 
                  key={country.id}
                  className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-16 items-center`}
                >
                  <div className="flex-1 space-y-8">
                    <div className="inline-flex items-center gap-4 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                      <Globe className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold text-primary uppercase tracking-wider">{country.name}</span>
                    </div>
                    
                    <div>
                      <h3 className="text-4xl font-bold mb-4">{country.title}</h3>
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        {country.description}
                      </p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      {country.advantages.map((adv, i) => (
                        <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50 border border-border/50">
                          <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                          <span className="text-sm font-medium">{adv}</span>
                        </div>
                      ))}
                    </div>

                    <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
                      <h4 className="font-bold flex items-center gap-2 mb-2 text-primary">
                        <Building2 className="w-5 h-5" />
                        Spécialités de Resourcing
                      </h4>
                      <p className="text-muted-foreground font-medium">
                        {country.specialties}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 w-full relative group">
                    <div className="absolute -inset-4 bg-primary/20 rounded-[2.5rem] blur-3xl opacity-30 group-hover:opacity-50 transition-opacity" />
                    <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden border border-border shadow-2xl">
                      <Image
                        src={country.image}
                        alt={country.name}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
                        <div className="text-white">
                          <p className="text-sm font-mono opacity-80 uppercase tracking-widest">Hub Alpha</p>
                          <p className="text-2xl font-bold">{country.name}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 text-white">
                          <div className="text-xs opacity-60">Croissance Sourcing</div>
                          <div className="text-xl font-bold text-primary">{country.stats.growth}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-24 relative overflow-hidden bg-primary/5 border-y border-primary/10">
          <div className="absolute top-0 left-0 w-full h-full pattern-grid opacity-10" />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold mb-8">
              Lancez votre importation <span className="text-gradient-gold">aujourd&apos;hui</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-12">
              Nos partenaires certifiés en Chine, Turquie, Dubaï, Thaïlande et Japon sont prêts à sécuriser votre sourcing.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="h-14 px-10 text-lg glow-gold" asChild>
                <Link href="/register">Ouvrir un compte</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-10 text-lg" asChild>
                <Link href="/contact">Parler à un expert</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
