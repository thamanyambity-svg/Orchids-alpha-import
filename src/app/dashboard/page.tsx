"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle2, 
  Ship,
  AlertTriangle,
  ArrowRight,
  Wallet,
  TrendingUp
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DashboardHeader } from "@/components/dashboard/header"

const stats = [
  { label: "Demandes en cours", value: "3", icon: FileText, trend: "+2 ce mois" },
  { label: "En attente de paiement", value: "1", icon: Clock, color: "text-warning" },
  { label: "En expédition", value: "1", icon: Ship, color: "text-chart-2" },
  { label: "Livrées", value: "12", icon: CheckCircle2, color: "text-success" },
]

const recentRequests = [
  { 
    id: "REQ-2024-001", 
    product: "Pièces automobiles", 
    country: "🇨🇳 Chine",
    status: "EXECUTING",
    statusLabel: "En cours",
    amount: "$15,000",
    date: "15 Jan 2024"
  },
  { 
    id: "REQ-2024-002", 
    product: "Électronique grand public", 
    country: "🇦🇪 Émirats",
    status: "ANALYSIS",
    statusLabel: "En analyse",
    amount: "$8,500",
    date: "12 Jan 2024"
  },
  { 
    id: "REQ-2024-003", 
    product: "Textiles", 
    country: "🇹🇷 Turquie",
    status: "SHIPPED",
    statusLabel: "Expédié",
    amount: "$22,000",
    date: "10 Jan 2024"
  },
]

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  ANALYSIS: "bg-primary/10 text-primary",
  VALIDATED: "bg-chart-2/10 text-chart-2",
  EXECUTING: "bg-chart-3/10 text-chart-3",
  SHIPPED: "bg-chart-4/10 text-chart-4",
  DELIVERED: "bg-success/10 text-success",
  INCIDENT: "bg-destructive/10 text-destructive",
}

export default function DashboardPage() {
  return (
    <div>
      <DashboardHeader 
        title="Tableau de bord" 
        subtitle="Bienvenue sur votre espace Alpha Import Exchange"
      />

      <div className="p-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-5 rounded-xl bg-card border border-border"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center ${stat.color || ""}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color || "text-primary"}`} />
                </div>
                {stat.trend && (
                  <div className="flex items-center gap-1 text-xs text-success">
                    <TrendingUp className="w-3 h-3" />
                    {stat.trend}
                  </div>
                )}
              </div>
              <p className="text-2xl font-bold mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="rounded-xl bg-card border border-border">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <h2 className="font-semibold">Demandes récentes</h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/requests" className="flex items-center gap-1">
                    Voir tout
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
              <div className="divide-y divide-border">
                {recentRequests.map((request) => (
                  <Link 
                    key={request.id} 
                    href={`/dashboard/requests/${request.id}`}
                    className="flex items-center gap-4 p-5 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-muted-foreground">{request.id}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${statusColors[request.status]}`}>
                          {request.statusLabel}
                        </span>
                      </div>
                      <p className="font-medium truncate">{request.product}</p>
                      <p className="text-sm text-muted-foreground">{request.country}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{request.amount}</p>
                      <p className="text-xs text-muted-foreground">{request.date}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold">Nouvelle demande</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Lancez une nouvelle demande d&apos;importation en quelques clics.
              </p>
              <Button asChild className="w-full">
                <Link href="/dashboard/requests/new">
                  Créer une demande
                </Link>
              </Button>
            </motion.div>

            <div className="p-5 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold">Paiement en attente</h3>
                  <p className="text-xs text-muted-foreground">1 paiement à effectuer</p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">REQ-2024-002</span>
                  <span className="font-semibold">$5,100</span>
                </div>
                <p className="text-xs text-muted-foreground">Acompte 60% - En attente</p>
              </div>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard/payments">
                  Voir les paiements
                </Link>
              </Button>
            </div>

            <div className="p-5 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-chart-2" />
                </div>
                <h3 className="font-semibold">Besoin d&apos;aide ?</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Notre équipe est disponible pour répondre à vos questions.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/contact">
                  Contacter le support
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
