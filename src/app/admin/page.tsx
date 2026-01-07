"use client"

import { motion } from "framer-motion"
import { 
  Users, 
  UserCheck, 
  FileText, 
  Wallet,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Globe2,
  CheckCircle2,
  Clock,
  Ship,
  BellRing,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DashboardHeader } from "@/components/dashboard/header"
import { useState } from "react"
import { toast } from "sonner"

const stats = [
  { label: "Acheteurs actifs", value: "156", icon: Users, trend: "+12%", color: "text-chart-2" },
  { label: "Partenaires", value: "4", icon: UserCheck, trend: "stable", color: "text-primary" },
  { label: "Demandes en cours", value: "23", icon: FileText, trend: "+8%", color: "text-chart-3" },
  { label: "Volume financier", value: "$1.2M", icon: Wallet, trend: "+24%", color: "text-success" },
]

const recentActivity = [
  { type: "request", message: "Nouvelle demande REQ-2024-156 créée", time: "Il y a 5 min", status: "new" },
  { type: "payment", message: "Paiement de $9,000 reçu pour ORD-2024-089", time: "Il y a 15 min", status: "success" },
  { type: "partner", message: "Partenaire Chine - Rapport mensuel soumis", time: "Il y a 1h", status: "info" },
  { type: "incident", message: "Incident signalé sur ORD-2024-078", time: "Il y a 2h", status: "warning" },
  { type: "validation", message: "Fournisseur validé: Guangzhou Electronics Ltd", time: "Il y a 3h", status: "success" },
]

  const pendingActions = [
    { label: "Demandes à valider", count: 5, href: "/admin/requests" },
    { label: "Paiements à autoriser", count: 3, href: "/admin/finances" },
    { label: "Incidents ouverts", count: 1, href: "/admin/incidents" },
  ]

const countryStats = [
  { country: "🇨🇳 Chine", requests: 45, volume: "$580K", status: "active" },
  { country: "🇦🇪 Émirats", requests: 28, volume: "$320K", status: "active" },
  { country: "🇹🇷 Turquie", requests: 18, volume: "$210K", status: "active" },
  { country: "🇹🇭 Thaïlande", requests: 12, volume: "$90K", status: "active" },
]

export default function AdminDashboardPage() {
  const [isTriggering, setIsTriggering] = useState(false)

  const handleTriggerReminders = async () => {
    setIsTriggering(true)
    try {
      const response = await fetch('/api/admin/reminders/trigger', {
        method: 'POST',
      })
      const data = await response.json()
      
      if (data.success) {
        toast.success(`${data.remindersSent} relances envoyées avec succès`)
      } else {
        toast.error("Erreur lors de l'envoi des relances")
      }
    } catch (error) {
      toast.error("Erreur de connexion")
    } finally {
      setIsTriggering(false)
    }
  }

  return (
    <div>
      <DashboardHeader 
        title="Administration Alpha" 
        subtitle="Vue globale des opérations"
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
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="flex items-center gap-1 text-xs text-success">
                  <TrendingUp className="w-3 h-3" />
                  {stat.trend}
                </div>
              </div>
              <p className="text-2xl font-bold mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 rounded-xl bg-card border border-border">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold">Activité récente</h2>
              <Button variant="ghost" size="sm">
                Voir tout
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="divide-y divide-border">
              {recentActivity.map((activity, index) => (
                <div key={index} className="p-4 flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.status === "success" ? "bg-success" :
                    activity.status === "warning" ? "bg-warning" :
                    activity.status === "new" ? "bg-primary" : "bg-muted-foreground"
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl bg-primary/10 border border-primary/20 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <BellRing className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Relances Automatiques</h3>
                  <p className="text-xs text-muted-foreground">Déclencher les rappels en attente</p>
                </div>
              </div>
              <Button 
                onClick={handleTriggerReminders} 
                disabled={isTriggering}
                className="w-full shadow-lg shadow-primary/20"
              >
                {isTriggering ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  'Lancer les relances'
                )}
              </Button>
            </div>

            <div className="rounded-xl bg-card border border-border">
              <div className="p-5 border-b border-border">
                <h2 className="font-semibold">Actions requises</h2>
              </div>
              <div className="p-3">
                {pendingActions.map((action, index) => (
                  <Link
                    key={index}
                    href={action.href}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <span className="text-sm">{action.label}</span>
                    <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {action.count}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-destructive/10 to-destructive/5 border border-destructive/20 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold">1 incident ouvert</h3>
                  <p className="text-xs text-muted-foreground">Nécessite votre attention</p>
                </div>
              </div>
              <Button variant="outline" className="w-full border-destructive/30 text-destructive hover:bg-destructive/10" asChild>
                <Link href="/admin/incidents">
                  Voir l&apos;incident
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-xl bg-card border border-border">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe2 className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Performance par pays</h2>
              </div>
            </div>
            <div className="p-3">
              {countryStats.map((country, index) => (
                <div key={index} className="flex items-center justify-between p-3 hover:bg-accent/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{country.country.split(' ')[0]}</span>
                    <div>
                      <p className="font-medium">{country.country.split(' ').slice(1).join(' ')}</p>
                      <p className="text-xs text-muted-foreground">{country.requests} demandes</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{country.volume}</p>
                    <div className="flex items-center gap-1 text-xs text-success">
                      <CheckCircle2 className="w-3 h-3" />
                      Actif
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-card border border-border">
            <div className="p-5 border-b border-border">
              <h2 className="font-semibold">Statut des commandes</h2>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: "En analyse", count: 5, icon: Clock, color: "bg-primary" },
                { label: "En exécution", count: 12, icon: FileText, color: "bg-chart-3" },
                { label: "En expédition", count: 6, icon: Ship, color: "bg-chart-4" },
                { label: "Livrées ce mois", count: 18, icon: CheckCircle2, color: "bg-success" },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg ${item.color}/10 flex items-center justify-center`}>
                    <item.icon className={`w-5 h-5 ${item.color.replace('bg-', 'text-')}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">{item.label}</span>
                      <span className="font-semibold">{item.count}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${item.color} rounded-full`}
                        style={{ width: `${(item.count / 41) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
