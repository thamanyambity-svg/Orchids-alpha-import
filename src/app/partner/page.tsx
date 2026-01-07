"use client"

import { motion } from "framer-motion"
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  Package,
  TrendingUp,
  Star,
  ArrowRight
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DashboardHeader } from "@/components/dashboard/header"

const stats = [
  { label: "Dossiers assignés", value: "8", icon: FileText, trend: "+3 cette semaine" },
  { label: "En cours de traitement", value: "5", icon: Clock, color: "text-warning" },
  { label: "Complétés ce mois", value: "12", icon: CheckCircle2, color: "text-success" },
  { label: "Score performance", value: "98%", icon: Star, color: "text-primary" },
]

const assignedRequests = [
  { 
    id: "REQ-2024-156", 
    buyer: "Jean Mbala",
    product: "Smartphones Samsung",
    quantity: "500 unités",
    budget: "$15,000",
    status: "EXECUTING",
    statusLabel: "En cours",
    deadline: "20 Jan 2024"
  },
  { 
    id: "REQ-2024-148", 
    buyer: "Marie Kalonji",
    product: "Pièces automobiles",
    quantity: "1000 unités",
    budget: "$28,000",
    status: "EXECUTING",
    statusLabel: "En cours",
    deadline: "25 Jan 2024"
  },
  { 
    id: "REQ-2024-142", 
    buyer: "Paul Tshisekedi",
    product: "Équipements médicaux",
    quantity: "50 unités",
    budget: "$45,000",
    status: "VALIDATED",
    statusLabel: "À traiter",
    deadline: "30 Jan 2024"
  },
]

const statusColors: Record<string, string> = {
  VALIDATED: "bg-primary/10 text-primary",
  EXECUTING: "bg-chart-3/10 text-chart-3",
  SHIPPED: "bg-chart-4/10 text-chart-4",
}

export default function PartnerDashboardPage() {
  return (
    <div>
      <DashboardHeader 
        title="Espace Partenaire" 
        subtitle="Gérez vos dossiers assignés"
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
                <div className={`w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center`}>
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
                <h2 className="font-semibold">Dossiers à traiter</h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/partner/requests" className="flex items-center gap-1">
                    Voir tout
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
              <div className="divide-y divide-border">
                {assignedRequests.map((request) => (
                  <Link 
                    key={request.id} 
                    href={`/partner/requests/${request.id}`}
                    className="flex items-center gap-4 p-5 hover:bg-accent/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-muted-foreground">{request.id}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${statusColors[request.status]}`}>
                          {request.statusLabel}
                        </span>
                      </div>
                      <p className="font-medium truncate">{request.product}</p>
                      <p className="text-sm text-muted-foreground">{request.buyer} • {request.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{request.budget}</p>
                      <p className="text-xs text-muted-foreground">Deadline: {request.deadline}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl bg-card border border-border p-5">
              <h3 className="font-semibold mb-4">Performance</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <span>Taux de réussite</span>
                    <span className="font-semibold">98%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-success rounded-full" style={{ width: "98%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <span>Respect des délais</span>
                    <span className="font-semibold">95%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: "95%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <span>Satisfaction acheteurs</span>
                    <span className="font-semibold">4.8/5</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-chart-2 rounded-full" style={{ width: "96%" }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 p-5">
              <h3 className="font-semibold mb-2">Fournisseurs actifs</h3>
              <p className="text-3xl font-bold text-primary mb-4">12</p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/partner/suppliers">
                  Gérer les fournisseurs
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
