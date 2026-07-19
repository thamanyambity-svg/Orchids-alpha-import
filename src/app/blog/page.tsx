"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Calendar, Clock, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const posts = [
  {
    slug: "guide-import-chine-rdc-2025",
    title: "Guide complet de l'import Chine vers RDC en 2025",
    excerpt: "Tout ce qu'il faut savoir pour importer depuis la Chine vers la République Démocratique du Congo : procédures, coûts, délais et sécurisation.",
    date: "2025-12-15",
    readTime: "8 min",
    category: "Guide",
  },
  {
    slug: "securisation-paiement-import",
    title: "Comment sécuriser vos paiements à l'international ?",
    excerpt: "Découvrez le système 60/40 qui protège acheteurs et fournisseurs dans les transactions d'importation.",
    date: "2025-11-28",
    readTime: "5 min",
    category: "Conseils",
  },
  {
    slug: "transport-maritime-rdc",
    title: "Transport maritime vers la RDC : tout comprendre",
    excerpt: "Les ports de Matadi et Boma, les itinéraires depuis la Chine, la Turquie et Dubai, et les formalités douanières.",
    date: "2025-11-10",
    readTime: "6 min",
    category: "Logistique",
  },
  {
    slug: "import-turquie-rdc-opportunites",
    title: "Pourquoi importer depuis la Turquie vers la RDC ?",
    excerpt: "Analyse des opportunités commerciales entre la Turquie et la RDC : secteurs porteurs, avantages logistiques et retours d'expérience.",
    date: "2025-10-22",
    readTime: "7 min",
    category: "Analyse",
  },
]

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="relative pt-32 pb-16 px-6 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-bold mb-4">Blog Import RDC</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Actualités, guides et conseils pour vos importations vers la République Démocratique du Congo.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts.map((post, i) => (
            <motion.article
              key={post.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-all"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">{post.category}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{post.date}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.readTime}</span>
              </div>
              <h2 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <p className="text-sm text-muted-foreground mb-4">{post.excerpt}</p>
              <Link href={`/blog/${post.slug}`} className="text-sm text-primary font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                Lire plus <ArrowRight className="w-3 h-3" />
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  )
}
