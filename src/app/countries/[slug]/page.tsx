"use client"

import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight, Shield, Ship, Clock, CheckCircle2, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"

const countryData: Record<string, { name: string; flag: string; desc: string; products: string[]; stats: string; volume: string }> = {
  chine: {
    name: "Chine",
    flag: "🇨🇳",
    desc: "Premier fournisseur mondial de la RDC. Importez depuis les plus grandes zones industrielles chinoises avec une sécurisation totale de vos fonds.",
    products: ["Électronique et télécoms", "Machinerie lourde", "Textiles et vêtements", "Matériaux de construction", "Équipements médicaux"],
    stats: "15M+ USD importés en 2025",
    volume: "40 jours transit moyen",
  },
  turquie: {
    name: "Turquie",
    flag: "🇹🇷",
    desc: "Hub industriel incontournable pour l'Afrique. Profitez de prix compétitifs et d'une logistique rapide depuis Istanbul et Mersin.",
    products: ["Acier et métaux", "Meubles et décoration", "Textiles maison", "Machines industrielles", "Produits chimiques"],
    stats: "8M+ USD importés en 2025",
    volume: "25 jours transit moyen",
  },
  dubai: {
    name: "Dubai",
    flag: "🇦🇪",
    desc: "Plateforme de réexportation mondiale. Accédez à des produits du monde entier via le port de Jebel Ali.",
    products: ["Produits alimentaires", "Matériel électrique", "Pierres et métaux précieux", "Véhicules", "Parfums et cosmétiques"],
    stats: "12M+ USD importés en 2025",
    volume: "30 jours transit moyen",
  },
  japon: {
    name: "Japon",
    flag: "🇯🇵",
    desc: "Excellence technologique et qualité premium. Importez machines, véhicules et électronique haut de gamme.",
    products: ["Véhicules et pièces", "Robotique industrielle", "Électronique grand public", "Instruments de précision", "Produits pharmaceutiques"],
    stats: "5M+ USD importés en 2025",
    volume: "50 jours transit moyen",
  },
  thailande: {
    name: "Thaïlande",
    flag: "🇹🇭",
    desc: "Usine de l'Asie du Sud-Est. Compétitivité prix et diversité de produits pour vos importations.",
    products: ["Riz et produits agro", "Pièces automobiles", "Caoutchouc et plastiques", "Bijoux et accessoires", "Climatisation"],
    stats: "3M+ USD importés en 2025",
    volume: "35 jours transit moyen",
  },
}

export default function CountryPage() {
  const { slug } = useParams()
  const country = countryData[slug as string]

  if (!country) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Pays non trouvé</h1>
          <Link href="/" className="text-primary hover:underline">Retour à l&apos;accueil</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative pt-32 pb-20 px-6 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-block">
              ← Retour
            </Link>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-5xl">{country.flag}</span>
              <h1 className="text-4xl font-bold">Import depuis la {country.name}</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-3xl">{country.desc}</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="text-2xl font-bold mb-6">Produits disponibles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {country.products.map((p, i) => (
              <div key={i} className="p-4 rounded-xl bg-card border border-border flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                <span>{p}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="p-6 rounded-xl bg-card border border-border text-center">
            <TrendingUp className="w-8 h-8 text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Volume total</p>
            <p className="text-xl font-bold">{country.stats}</p>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border text-center">
            <Ship className="w-8 h-8 text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Transit</p>
            <p className="text-xl font-bold">{country.volume}</p>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border text-center">
            <Shield className="w-8 h-8 text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Protection</p>
            <p className="text-xl font-bold">100% sécurisé</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="text-center"
        >
          <Button size="lg" asChild>
            <Link href="/register">
              Commencer mon import depuis {country.name} <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
