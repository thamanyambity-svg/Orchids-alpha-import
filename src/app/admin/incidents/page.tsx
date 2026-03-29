"use client"

import { useEffect, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { DashboardHeader } from "@/components/dashboard/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import type { Incident, Order, Profile } from "@/lib/types"

export default function AdminIncidentsPage() {
  const [incidents, setIncidents] = useState<(Incident & { order: Order, reporter: Profile })[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchIncidents()
  }, [])

  async function fetchIncidents() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("incidents")
        .select(`
          *,
          order:orders(*),
          reporter:profiles!incidents_reported_by_fkey(*)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setIncidents((data ?? []) as (Incident & { order: Order; reporter: Profile })[])
    } catch (error: unknown) {
      toast.error("Erreur: " + (error instanceof Error ? error.message : String(error)))
    } finally {
      setLoading(false)
    }
  }

  async function handleFreezeOrder(incidentId: string, orderId: string) {
    try {
      // 1. Freeze order
      const { error: orderError } = await supabase
        .from("orders")
        .update({ is_frozen: true, status: "FROZEN" })
        .eq("id", orderId)

      if (orderError) throw orderError

      // 2. Update incident status to FROZEN
      const { error: incError } = await supabase
        .from("incidents")
        .update({ status: "FROZEN", updated_at: new Date().toISOString() })
        .eq("id", incidentId)

      if (incError) throw incError

      toast.success("Commande gelée automatiquement pour analyse")
      fetchIncidents()
    } catch (error: unknown) {
      toast.error("Erreur: " + (error instanceof Error ? error.message : String(error)))
    }
  }

  async function handleResolveIncident(incidentId: string, orderId: string) {
    try {
      // 1. Unfreeze order
      const { error: orderError } = await supabase
        .from("orders")
        .update({ is_frozen: false, status: "EXECUTING" })
        .eq("id", orderId)

      if (orderError) throw orderError

      // 2. Resolve incident
      const { error: incError } = await supabase
        .from("incidents")
        .update({
          status: "RESOLVED",
          resolved_at: new Date().toISOString()
        })
        .eq("id", incidentId)

      if (incError) throw incError

      toast.success("Incident résolu. Commande dégelée.")
      fetchIncidents()
    } catch (error: unknown) {
      toast.error("Erreur: " + (error instanceof Error ? error.message : String(error)))
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader
        title="Gestion des Incidents"
        subtitle="Analyse et résolution des litiges sur le flux import"
      />

      <div className="p-6 space-y-6">
        <div className="bg-destructive/5 border border-destructive/20 p-6 rounded-2xl flex items-start gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-destructive mb-1">Protocole de Gel Automatique</h3>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Tout incident signalé déclenche un gel des fonds sur le compte séquestre.
              Aucun paiement ne peut être effectué tant que l&apos;administrateur n&apos;a pas rendu sa décision.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-muted/50 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Incident / Commande</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Signalé par</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center">Chargement...</td></tr>
              ) : incidents.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Aucun incident à traiter</td></tr>
              ) : incidents.map((inc) => (
                <tr key={inc.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold">INC-{inc.id.slice(0, 8).toUpperCase()}</div>
                    <div className="text-xs text-muted-foreground">Ref Order: {inc.order?.reference}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline">{inc.type}</Badge>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {inc.reporter?.full_name}
                  </td>
                  <td className="px-6 py-4">
                    {inc.status === "FROZEN" ? (
                      <Badge className="bg-destructive/10 text-destructive border-destructive/20 animate-pulse">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Gelé
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{inc.status}</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {inc.status === "OPEN" && (
                      <Button size="sm" variant="destructive" onClick={() => handleFreezeOrder(inc.id, inc.order_id)}>
                        <AlertTriangle className="w-4 h-4 mr-1" /> Geler Commande
                      </Button>
                    )}
                    {inc.status === "FROZEN" && (
                      <Button size="sm" variant="default" onClick={() => handleResolveIncident(inc.id, inc.order_id)}>
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Résoudre
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
