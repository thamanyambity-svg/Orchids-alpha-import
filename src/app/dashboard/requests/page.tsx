"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { 
  Plus, 
  Search, 
  Filter,
  ArrowRight,
  FileText,
  MoreHorizontal
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DashboardHeader } from "@/components/dashboard/header"

const requests = [
  { 
    id: "REQ-2024-001", 
    product: "Pièces automobiles - moteurs diesel",
    category: "Automobile",
    country: "🇨🇳 Chine",
    status: "EXECUTING",
    statusLabel: "En exécution",
    amount: "$15,000",
    quantity: "500 unités",
    createdAt: "15 Jan 2024",
    deadline: "15 Fév 2024"
  },
  { 
    id: "REQ-2024-002", 
    product: "Smartphones et accessoires",
    category: "Électronique",
    country: "🇦🇪 Émirats",
    status: "ANALYSIS",
    statusLabel: "En analyse",
    amount: "$8,500",
    quantity: "200 unités",
    createdAt: "12 Jan 2024",
    deadline: "28 Jan 2024"
  },
  { 
    id: "REQ-2024-003", 
    product: "Tissus et textiles",
    category: "Textile",
    country: "🇹🇷 Turquie",
    status: "SHIPPED",
    statusLabel: "En expédition",
    amount: "$22,000",
    quantity: "2000 mètres",
    createdAt: "10 Jan 2024",
    deadline: "20 Fév 2024"
  },
  { 
    id: "REQ-2023-045", 
    product: "Machines industrielles",
    category: "Industrie",
    country: "🇨🇳 Chine",
    status: "DELIVERED",
    statusLabel: "Livré",
    amount: "$45,000",
    quantity: "5 unités",
    createdAt: "15 Déc 2023",
    deadline: "Complété"
  },
  { 
    id: "REQ-2023-044", 
    product: "Cosmétiques et parfums",
    category: "Cosmétique",
    country: "🇹🇭 Thaïlande",
    status: "DELIVERED",
    statusLabel: "Livré",
    amount: "$12,000",
    quantity: "1000 unités",
    createdAt: "10 Déc 2023",
    deadline: "Complété"
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
  CLOSED: "bg-muted text-muted-foreground",
}

export default function RequestsPage() {
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredRequests = requests.filter(req => {
    const matchesStatus = statusFilter === "all" || req.status === statusFilter
    const matchesSearch = req.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         req.id.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  return (
    <div>
      <DashboardHeader 
        title="Mes demandes" 
        subtitle="Gérez vos demandes d'importation"
      />

      <div className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher une demande..." 
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="DRAFT">Brouillon</SelectItem>
                <SelectItem value="ANALYSIS">En analyse</SelectItem>
                <SelectItem value="VALIDATED">Validé</SelectItem>
                <SelectItem value="EXECUTING">En exécution</SelectItem>
                <SelectItem value="SHIPPED">Expédié</SelectItem>
                <SelectItem value="DELIVERED">Livré</SelectItem>
              </SelectContent>
            </Select>
            <Button asChild>
              <Link href="/dashboard/requests/new" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nouvelle demande
              </Link>
            </Button>
          </div>
        </div>

        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Référence</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Produit</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Pays</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Statut</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Montant</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request, index) => (
                  <motion.tr
                    key={request.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-border hover:bg-accent/30 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-mono text-sm">{request.id}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-medium truncate max-w-[200px]">{request.product}</p>
                      <p className="text-xs text-muted-foreground">{request.category}</p>
                    </td>
                    <td className="p-4 text-sm">{request.country}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[request.status]}`}>
                        {request.statusLabel}
                      </span>
                    </td>
                    <td className="p-4 font-semibold">{request.amount}</td>
                    <td className="p-4 text-sm text-muted-foreground">{request.createdAt}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/requests/${request.id}`} className="flex items-center gap-1">
                            Détails
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRequests.length === 0 && (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Aucune demande trouvée</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Modifiez vos filtres ou créez une nouvelle demande.
              </p>
              <Button asChild>
                <Link href="/dashboard/requests/new">
                  Créer une demande
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
