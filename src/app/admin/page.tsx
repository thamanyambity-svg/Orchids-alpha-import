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
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

const ICON_MAP: Record<string, any> = {
  Wallet,
  FileText,
  Ship,
  UserCheck
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/admin/dashboard')
        const json = await res.json()
        setData(json)
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#ffd700] animate-spin" />
      </div>
    )
  }

  const { stats, partners, recentRequests, auditLogs, criticalAlerts } = data || {
    stats: [],
    partners: [],
    recentRequests: [],
    auditLogs: [],
    criticalAlerts: []
  }

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Tableau de Bord</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60">
            <span>Dernière mise à jour: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat: any, i: number) => {
          const Icon = ICON_MAP[stat.icon] || Wallet

          // Determine link target based on label logic
          let href = "/admin"
          if (stat.label.includes("Funds")) href = "/admin/finances"
          else if (stat.label.includes("Demandes")) href = "/admin/requests"
          else if (stat.label.includes("Fret")) href = "/admin/shipping"
          else if (stat.label.includes("Partenaires")) href = "/admin/partners"

          return (
            <Link key={i} href={href} className="block">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative group overflow-hidden"
              >
                <div className="p-6 rounded-2xl bg-[#0a0e14] border border-white/5 hover:border-[#ffd700]/30 transition-all duration-500 cursor-pointer h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn("p-2 rounded-lg bg-white/5 transition-colors group-hover:bg-white/10", stat.color)}>
                      <Icon className="w-5 h-5" />
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
                    <Icon className="w-24 h-24" />
                  </div>
                </div>
              </motion.div>
            </Link>
          )
        })}
      </div>

      {/* World Map Section */}
      <div className="relative aspect-[21/9] rounded-3xl overflow-hidden bg-[#0a0e14] border border-white/5 group">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-30 mix-blend-luminosity grayscale" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020609] via-transparent to-transparent" />

        {/* Map Markers - These could also be dynamic later */}
        <div className="absolute top-[30%] left-[75%] group/pin">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-20" />
            <div className="w-3 h-3 rounded-full bg-blue-400 border-2 border-white shadow-[0_0_15px_#60a5fa]" />
            <div className="absolute left-6 -top-1 px-3 py-1 bg-black/80 backdrop-blur-md rounded-lg border border-white/10 whitespace-nowrap">
              <span className="text-xs text-white font-medium">Chine</span>
            </div>
          </div>
        </div>

        <div className="absolute top-[50%] left-[60%] group/pin">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-[#ffd700] opacity-20" />
            <div className="w-3 h-3 rounded-full bg-[#ffd700] border-2 border-white shadow-[0_0_15px_#ffd700]" />
            <div className="absolute left-6 -top-1 px-3 py-1 bg-black/80 backdrop-blur-md rounded-lg border border-white/10 whitespace-nowrap">
              <span className="text-xs text-white font-medium">Dubaï</span>
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
            <Link href="/admin/partners">
              <Button variant="ghost" size="sm" className="text-[10px] text-white/40 uppercase tracking-widest hover:text-white">
                Voir tout <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-white/5">
                  <th className="pb-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">Partenaire</th>
                  <th className="pb-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">Pays</th>
                  <th className="pb-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">Performance</th>
                  <th className="pb-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">Volume</th>
                  <th className="pb-4 text-[10px] font-bold text-white/20 uppercase tracking-widest text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {partners.length > 0 ? partners.map((p: any, i: number) => (
                  <tr key={i} className="group hover:bg-white/5 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-white/5 border border-white/10" />
                        <span className="text-xs font-medium text-white/90">{p.name}</span>
                      </div>
                    </td>
                    <td className="py-4 text-xs text-white/40">{p.country}</td>
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
                      <span className={cn(
                        "text-[10px] font-bold border px-2 py-0.5 rounded uppercase tracking-tighter",
                        p.status === 'Actif' ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/5" : "text-white/40 border-white/10 bg-white/5"
                      )}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-white/20">Aucun partenaire actif</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Requests List */}
        <div className="p-6 rounded-2xl bg-[#0a0e14] border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold tracking-[0.2em] text-white/80 uppercase">Demandes récentes</h3>
            <Link href="/admin/requests">
              <Button variant="ghost" size="sm" className="text-[10px] text-white/40 uppercase tracking-widest hover:text-white">
                Voir tout <ListFilter className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-4">
            {recentRequests.length > 0 ? recentRequests.map((req: any, i: number) => (
              <Link key={i} href={`/admin/requests/${req.realId}`} className="block">
                <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all">
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
              </Link>
            )) : (
              <div className="py-8 text-center text-xs text-white/20">Aucune demande récente</div>
            )}
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
              {auditLogs.length > 0 && <span className="w-4 h-4 flex items-center justify-center bg-destructive text-[8px] font-bold text-white rounded-full">{auditLogs.length}</span>}
            </div>
            <Button variant="ghost" size="sm" className="text-[10px] text-white/40">Synchronisé</Button>
          </div>
          <div className="space-y-4">
            {auditLogs.length > 0 ? auditLogs.map((log: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-white/5 group hover:border-white/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-white/40" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">
                      {log.action} <span className="text-white/40">sur</span> {log.target}
                    </p>
                    <p className="text-[10px] text-white/40">{log.user}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[#ffd700] font-bold">{log.time}</span>
                  <div className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-bold text-white/40 uppercase">{log.status}</div>
                </div>
              </div>
            )) : (
              <div className="py-8 text-center text-xs text-white/20">Aucun log récent</div>
            )}
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="p-6 rounded-2xl bg-[#0a0e14] border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold tracking-[0.2em] text-white/80 uppercase">Alertes Critiques</h3>
            <div className="flex gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
          </div>
          <div className="space-y-4">
            {criticalAlerts.length > 0 ? criticalAlerts.map((alert: any, i: number) => (
              <div key={i} className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 group hover:border-destructive/40 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white mb-1">{alert.title}</h4>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">{alert.location} • {alert.time}</p>
                  </div>
                  <Link href="/admin/risks">
                    <Button variant="ghost" size="sm" className="text-[10px] text-destructive hover:bg-destructive/10">Voir</Button>
                  </Link>
                </div>
              </div>
            )) : (
              <div className="py-8 text-center text-xs text-white/20">Aucune alerte critique</div>
            )}
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
          <Link href="/admin">
            <Button variant="ghost" size="icon" className="text-[#ffd700] bg-[#ffd700]/10 border border-[#ffd700]/20 scale-110 shadow-[0_0_15px_rgba(255,215,0,0.2)]">
              <LayoutGrid className="w-5 h-5" />
            </Button>
          </Link>
          <Link href="/admin/requests">
            <Button variant="ghost" size="icon" className="text-white/40 hover:text-white transition-colors">
              <FileText className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-px h-6 bg-white/10" />
          <Link href="/admin/settings">
            <Button variant="ghost" size="icon" className="text-white/40 hover:text-white transition-colors">
              <Settings className="w-5 h-5" />
            </Button>
          </Link>
          <Link href="/admin/incidents">
            <Button variant="ghost" size="icon" className="text-white/40 hover:text-emerald-400 transition-colors">
              <ShieldCheck className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
