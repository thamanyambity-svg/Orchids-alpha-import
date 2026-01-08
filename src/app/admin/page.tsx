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
  Loader2,
  Plus,
  MoreHorizontal,
  Star,
  Zap,
  ShieldCheck,
  Search,
  Settings,
  ChevronDown,
  LayoutGrid,
  ListFilter
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { cn } from "@/lib/utils"

const stats = [
  { label: "Total Funds contrôlés", value: "785,420$", icon: Wallet, trend: null, color: "text-[#ffd700]" },
  { label: "Demandes en cours", value: "92", icon: FileText, trend: "7%", color: "text-blue-400" },
  { label: "Fret maritime en cours", value: "42,570$", icon: Ship, trend: null, color: "text-orange-400" },
  { label: "Partenaires à bord", value: "204", icon: UserCheck, trend: "+19", color: "text-emerald-400" },
]

const partners = [
  { name: "Guangdong Logistics", country: "Chine", rating: 5, performance: 85, volume: "32,000$", status: "Actif" },
  { name: "Orient Trade Inc.", country: "Émirats", rating: 5, performance: 65, volume: "15,000$", status: "Actif" },
  { name: "Istanbul Import Solutions", country: "Turquie", rating: 4, performance: 45, volume: "28,000$", status: "Actif" },
  { name: "Thai Global Sourcing", country: "Thaïlande", rating: 5, performance: 75, volume: "17,000$", status: "Actif" },
]

const recentRequests = [
  { id: "543298", product: "Electronic Parts", partner: "Guangdong Logistics", status: "Analyse", statusColor: "text-blue-400 bg-blue-400/10" },
  { id: "543297", product: "Beauty Products", partner: "Orient Trade Inc", status: "Initalisation", statusColor: "text-emerald-400 bg-emerald-400/10" },
  { id: "543221", product: "Auto Products", partner: "Istanbul Import Solutions", status: "Analyse", statusColor: "text-orange-400 bg-orange-400/10" },
  { id: "542225", product: "Home & Decor", partner: "Thai Global Sourcing", status: "Accordé", statusColor: "text-purple-400 bg-purple-400/10" },
]

const auditLogs = [
  { action: "Devis validé", target: "demande #543207", user: "Jean K.", status: "Audit", time: "22%" },
  { action: "Paiement sécurisé", target: "25,000$ reçu", user: "Anne M.", status: "Validé", time: "18%" },
  { action: "Massage & Commande", target: "demande #543375", user: "Jaunhla.", status: "Traité", time: "Juste" },
]

const criticalAlerts = [
  { title: "Turquie Import LT suspecté", location: "Turquie", time: "20h ago" },
  { title: "Dubai.. Soucis logistique via OrientTrade", location: "Dubai", time: "35h ago" },
]

export default function AdminDashboardPage() {
  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Tableau de Bord</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60">
            <span>Régler les...</span>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="relative group overflow-hidden"
          >
            <div className="p-6 rounded-2xl bg-[#0a0e14] border border-white/5 hover:border-[#ffd700]/30 transition-all duration-500">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2 rounded-lg bg-white/5", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                {stat.trend && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                    <TrendingUp className="w-3 h-3" />
                    {stat.trend}
                  </div>
                )}
              </div>
              <p className="text-xs text-white/40 font-medium mb-1 uppercase tracking-wider">{stat.label}</p>
              <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
              
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <stat.icon className="w-24 h-24" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* World Map Section */}
      <div className="relative aspect-[21/9] rounded-3xl overflow-hidden bg-[#0a0e14] border border-white/5 group">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-30 mix-blend-luminosity grayscale" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020609] via-transparent to-transparent" />
        
        {/* Map Markers */}
        <div className="absolute top-[30%] left-[75%] group/pin">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-20" />
            <div className="w-3 h-3 rounded-full bg-blue-400 border-2 border-white shadow-[0_0_15px_#60a5fa]" />
            <div className="absolute left-6 -top-1 px-3 py-1 bg-black/80 backdrop-blur-md rounded-lg border border-white/10 whitespace-nowrap">
              <span className="text-xs text-white font-medium">Chine <span className="text-blue-400">6</span></span>
            </div>
          </div>
        </div>

        <div className="absolute top-[50%] left-[60%] group/pin">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-[#ffd700] opacity-20" />
            <div className="w-3 h-3 rounded-full bg-[#ffd700] border-2 border-white shadow-[0_0_15px_#ffd700]" />
            <div className="absolute left-6 -top-1 px-3 py-1 bg-black/80 backdrop-blur-md rounded-lg border border-white/10 whitespace-nowrap">
              <span className="text-xs text-white font-medium">Dubai <span className="text-[#ffd700]">3</span></span>
            </div>
          </div>
        </div>

        <div className="absolute top-[40%] left-[55%] group/pin">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-orange-400 opacity-20" />
            <div className="w-3 h-3 rounded-full bg-orange-400 border-2 border-white shadow-[0_0_15px_#fb923c]" />
            <div className="absolute left-6 -top-1 px-3 py-1 bg-black/80 backdrop-blur-md rounded-lg border border-white/10 whitespace-nowrap">
              <span className="text-xs text-white font-medium">Turquie <span className="text-orange-400">6</span></span>
            </div>
          </div>
        </div>

        <div className="absolute top-[65%] left-[75%] group/pin">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-20" />
            <div className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-white shadow-[0_0_15px_#34d399]" />
            <div className="absolute left-6 -top-1 px-3 py-1 bg-black/80 backdrop-blur-md rounded-lg border border-white/10 whitespace-nowrap">
              <span className="text-xs text-white font-medium">Thaïlande <span className="text-emerald-400">2</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Partners Table */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0a0e14] border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold tracking-[0.2em] text-white/80 uppercase">Partenaires Actifs</h3>
            <Button variant="ghost" size="sm" className="text-[10px] text-white/40 uppercase tracking-widest hover:text-white">
              Voir tout <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-white/5">
                  <th className="pb-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">Partenaire</th>
                  <th className="pb-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">Pays</th>
                  <th className="pb-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">Note</th>
                  <th className="pb-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">Performance</th>
                  <th className="pb-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">Volume</th>
                  <th className="pb-4 text-[10px] font-bold text-white/20 uppercase tracking-widest text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {partners.map((p, i) => (
                  <tr key={i} className="group hover:bg-white/5 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-white/5 border border-white/10" />
                        <span className="text-xs font-medium text-white/90">{p.name}</span>
                      </div>
                    </td>
                    <td className="py-4 text-xs text-white/40">{p.country}</td>
                    <td className="py-4">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={cn("w-3 h-3", i < p.rating ? "text-[#ffd700] fill-[#ffd700]" : "text-white/10")} />
                        ))}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="w-24 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#ffd700] to-orange-500 rounded-full"
                          style={{ width: `${p.performance}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-4 text-xs font-bold text-white/80">{p.volume}</td>
                    <td className="py-4 text-right">
                      <span className="text-[10px] font-bold text-emerald-400 border border-emerald-400/20 bg-emerald-400/5 px-2 py-0.5 rounded uppercase tracking-tighter">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Requests List */}
        <div className="p-6 rounded-2xl bg-[#0a0e14] border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold tracking-[0.2em] text-white/80 uppercase">Demandes en cours</h3>
            <Button variant="ghost" size="sm" className="text-[10px] text-white/40 uppercase tracking-widest hover:text-white">
              Filtrer <ListFilter className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-4">
            {recentRequests.map((req, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all">
                <div className="flex flex-col items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mb-1 shadow-[0_0_8px_#60a5fa]" />
                  <div className="w-px h-8 bg-white/5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-white/20">#{req.id}</span>
                    <span className="text-xs font-semibold text-white truncate">{req.product}</span>
                  </div>
                  <p className="text-[10px] text-white/40 truncate uppercase tracking-tight">{req.partner}</p>
                </div>
                <div className={cn("text-[10px] font-bold px-2 py-1 rounded uppercase tracking-tighter", req.statusColor)}>
                  {req.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Audit Log */}
        <div className="p-6 rounded-2xl bg-[#0a0e14] border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-[0.2em] text-white/80 uppercase">Journal d&apos;Audit</h3>
              <span className="w-4 h-4 flex items-center justify-center bg-destructive text-[8px] font-bold text-white rounded-full">3</span>
            </div>
            <Button variant="ghost" size="sm" className="text-[10px] text-white/40">Sincronisé</Button>
          </div>
          <div className="space-y-4">
            {auditLogs.map((log, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-white/5 group hover:border-white/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-white/40" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">
                      {log.action} <span className="text-white/40">pour la</span> {log.target}
                    </p>
                    <p className="text-[10px] text-white/40">{log.user}, Alpha Audit</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[#ffd700] font-bold">{log.time}</span>
                  <div className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-bold text-white/40 uppercase">{log.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="p-6 rounded-2xl bg-[#0a0e14] border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold tracking-[0.2em] text-white/80 uppercase">Alertes Critiques</h3>
            <div className="flex gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <MoreHorizontal className="w-4 h-4 text-white/20" />
            </div>
          </div>
          <div className="space-y-4">
            {criticalAlerts.map((alert, i) => (
              <div key={i} className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 group hover:border-destructive/40 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white mb-1">{alert.title}</h4>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">{alert.location} • {alert.time}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-[10px] text-destructive hover:bg-destructive/10">Voir</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Toolbar/Dock */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className="px-6 py-3 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center gap-6">
          <Button variant="ghost" size="icon" className="text-white/40 hover:text-[#ffd700] transition-colors">
            <Search className="w-5 h-5" />
          </Button>
          <div className="w-px h-6 bg-white/10" />
          <Button variant="ghost" size="icon" className="text-[#ffd700] bg-[#ffd700]/10 border border-[#ffd700]/20 scale-110 shadow-[0_0_15px_rgba(255,215,0,0.2)]">
            <LayoutGrid className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white/40 hover:text-white transition-colors">
            <FileText className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white/40 hover:text-white transition-colors">
            <Search className="w-5 h-5" />
          </Button>
          <div className="w-px h-6 bg-white/10" />
          <Button variant="ghost" size="icon" className="text-white/40 hover:text-white transition-colors">
            <Settings className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white/40 hover:text-emerald-400 transition-colors">
            <ShieldCheck className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
