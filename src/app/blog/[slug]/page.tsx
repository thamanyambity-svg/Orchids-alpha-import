"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, Calendar, Clock } from "lucide-react"

const posts: Record<string, { title: string; content: string; date: string; readTime: string; category: string }> = {
  "guide-import-chine-rdc-2025": {
    title: "Guide complet de l'import Chine vers RDC en 2025",
    content: `
      <p>Importer depuis la Chine vers la République Démocratique du Congo est un processus qui nécessite une bonne préparation. Voici les étapes clés :</p>
      <h3>1. Identification des fournisseurs</h3>
      <p>Utilisez des plateformes comme Alibaba, les salons professionnels (Canton Fair) ou nos partenaires certifiés pour trouver des fournisseurs fiables.</p>
      <h3>2. Négociation et devis</h3>
      <p>Obtenez des devis détaillés (FOB ou CIF). Notre plateforme vous accompagne dans la vérification des fournisseurs.</p>
      <h3>3. Commande et paiement sécurisé</h3>
      <p>Avec Alpha Import Exchange, vous versez 60% à la commande et 40% à la livraison. Vos fonds sont protégés.</p>
      <h3>4. Transport et logistique</h3>
      <p>Le transport maritime depuis Shanghai ou Shenzhen jusqu'à Matadi prend environ 35-45 jours.</p>
      <h3>5. Dédouanement</h3>
      <p>Nous assistons nos clients dans toutes les formalités douanières RDC.</p>
    `,
    date: "2025-12-15",
    readTime: "8 min",
    category: "Guide",
  },
  "securisation-paiement-import": {
    title: "Comment sécuriser vos paiements à l'international ?",
    content: `
      <p>La sécurisation des paiements est la préoccupation numéro 1 des importateurs. Notre système 60/40 répond à ce besoin.</p>
      <h3>Le principe 60/40</h3>
      <p>60% à la commande (acompte) : ce montant couvre les frais de production et d'expédition. Il est versé sur un compte sécurisé.</p>
      <p>40% à la livraison (solde) : payé uniquement quand la marchandise arrive à destination et est vérifiée.</p>
      <h3>Avantages</h3>
      <ul>
        <li>Protection de l'acheteur : ne payez le solde qu'à réception</li>
        <li>Protection du vendeur : l'acompte garantit la commande</li>
        <li>Traçabilité via Stripe et blockchain</li>
      </ul>
    `,
    date: "2025-11-28",
    readTime: "5 min",
    category: "Conseils",
  },
}

export default function BlogArticlePage() {
  const { slug } = useParams()
  const post = posts[slug as string]

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Article non trouvé</h1>
          <Link href="/blog" className="text-primary hover:underline">Retour au blog</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-8">
            <ArrowLeft className="w-4 h-4" /> Retour au blog
          </Link>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">{post.category}</span>
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{post.date}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.readTime}</span>
          </div>
          <h1 className="text-3xl font-bold mb-8">{post.title}</h1>
          <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />
        </motion.div>
      </div>
    </div>
  )
}
