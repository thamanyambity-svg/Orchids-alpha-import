"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Webhook,
  Search,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DashboardHeader } from "@/components/dashboard/header"
import { createClient } from "@/lib/supabase/client"

type WebhookEntry = {
  id: string
  source: "stripe" | "n8n"
  type: string
  status: string
  created_at: string
  details?: any
}

export default function AdminWebhooksPage() {
  const [events, setEvents] = useState<WebhookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [selectedEvent, setSelectedEvent] = useState<WebhookEntry | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchEvents()
  }, [])

  async function fetchEvents() {
    setLoading(true)
    try {
      const { data: stripeEvents } = await supabase
        .from("processed_stripe_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)

      const { data: n8nLogs } = await supabase
        .from("audit_logs")
        .select("*")
        .ilike("action", "N8N_%")
        .order("created_at", { ascending: false })
        .limit(100)

      const mapped: WebhookEntry[] = [
        ...(stripeEvents || []).map((e: any) => ({
          id: e.id,
          source: "stripe" as const,
          type: e.type,
          status: "processed",
          created_at: e.created_at,
          details: { event_id: e.event_id },
        })),
        ...(n8nLogs || []).map((l: any) => ({
          id: l.id,
          source: "n8n" as const,
          type: l.action,
          status: "processed",
          created_at: l.created_at,
          details: l.details,
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setEvents(mapped)
    } catch (e) {
      console.error("Failed to fetch webhook events:", e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = events.filter(e => {
    if (sourceFilter !== "all" && e.source !== sourceFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return e.type.toLowerCase().includes(q) || e.id.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader
        title="Webhooks"
        subtitle="Journal des événements reçus par les webhooks Stripe et n8n"
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div className="p-5 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Webhook className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total événements</p>
                <p className="text-xl font-bold">{events.length}</p>
              </div>
            </div>
          </div>
          <div className="p-5 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <ExternalLink className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Stripe</p>
                <p className="text-xl font-bold">{events.filter(e => e.source === "stripe").length}</p>
              </div>
            </div>
          </div>
          <div className="p-5 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">n8n</p>
                <p className="text-xl font-bold">{events.filter(e => e.source === "n8n").length}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par type ou ID..."
              className="w-64 pl-9 pr-3 py-1.5 text-sm rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 outline-none"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="text-sm rounded-lg bg-background border border-border px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/20"
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
          >
            <option value="all">Toutes les sources</option>
            <option value="stripe">Stripe</option>
            <option value="n8n">n8n</option>
          </select>
          <Button variant="outline" size="sm" onClick={fetchEvents}>
            <RefreshCw className="w-4 h-4 mr-1" /> Actualiser
          </Button>
        </div>

        {/* Event list */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-border bg-card"
        >
          {loading ? (
            <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Aucun événement webhook trouvé</div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((event) => (
                <button
                  key={event.id}
                  onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
                  className="w-full text-left px-6 py-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        event.source === "stripe"
                          ? "bg-blue-500/10 text-blue-500"
                          : "bg-emerald-500/10 text-emerald-500"
                      }`}>
                        {event.source === "stripe" ? (
                          <ExternalLink className="w-4 h-4" />
                        ) : (
                          <Activity className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {event.source}
                          </Badge>
                          <span className="text-sm font-medium truncate">{event.type}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(event.created_at).toLocaleString("fr-FR")}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-success/10 text-success border-success/20 ml-4">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Traité
                    </Badge>
                  </div>

                  {/* Expanded details */}
                  {selectedEvent?.id === event.id && event.details && (
                    <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border">
                      <pre className="text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(event.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

function Activity(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}
