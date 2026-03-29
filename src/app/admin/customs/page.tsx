"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { FileCheck, Package, MapPin } from "lucide-react"
import Link from "next/link"

interface CustomsEvent {
  id: string
  event_date: string
  status: string
  location: string
  request_id: string
  description: string | null
  request?: {
    reference: string
    buyer?: { full_name: string | null; email: string } | null
    country?: { name: string; code: string } | null
  } | null
}

interface PendingOrder {
  id: string
  reference: string
  status: string
  request_id: string
  request?: {
    reference: string
    buyer?: { full_name: string | null } | null
    country?: { name: string; code: string } | null
  } | null
}

export default function AdminCustomsPage() {
  const [customsEvents, setCustomsEvents] = useState<CustomsEvent[]>([])
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchCustomsData()
  }, [])

  async function fetchCustomsData() {
    setLoading(true)
    try {
      // 1. Tracking events with CUSTOMS status or customs-related
      const { data: eventsData } = await supabase
        .from('tracking_events')
        .select(`
          *,
          request:import_requests(
            id,
            reference,
            buyer:profiles(full_name, email),
            country:countries(name, code)
          )
        `)
        .eq('status', 'CUSTOMS')
        .order('event_date', { ascending: false })

      // 2. Orders in transit/shipped that might reach customs
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          *,
          request:import_requests(
            reference,
            buyer:profiles(full_name),
            country:countries(name, code)
          )
        `)
        .in('status', ['SHIPPED', 'EXECUTING', 'PURCHASED'])
        .order('updated_at', { ascending: false })

      setCustomsEvents(eventsData || [])
      setPendingOrders(ordersData || [])
    } catch (error) {
      console.error("Error fetching customs data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[200px]">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Douanes & Conformité</h1>
        <p className="text-muted-foreground">
          Suivi des déclarations douanières et conformité des expéditions.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Douane</CardTitle>
            <FileCheck className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customsEvents.length}</div>
            <p className="text-xs text-muted-foreground">Événements douaniers signalés</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Transit / Livraison</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders.length}</div>
            <p className="text-xs text-muted-foreground">Commandes en cours</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Événements Douaniers
          </CardTitle>
          <CardDescription>
            Suivi des passages en douane et déblocages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Lieu</TableHead>
                <TableHead>Demande</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customsEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Aucun événement douanier enregistré. Les passages en douane apparaîtront ici.
                  </TableCell>
                </TableRow>
              ) : (
                customsEvents.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell>{new Date(ev.event_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={ev.status === 'CUSTOMS' ? 'default' : 'outline'}>
                        {ev.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{ev.location}</TableCell>
                    <TableCell className="font-mono text-xs">
                      <Link href={`/admin/requests/${ev.request_id}`} className="text-primary hover:underline">
                        {ev.request?.reference || ev.request_id?.slice(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell>{ev.request?.buyer?.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                      {ev.description || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commandes en attente de dédouanement</CardTitle>
          <CardDescription>
            Expéditions pouvant arriver en douane prochainement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Réf. Commande</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Pays</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Aucune commande en transit pour le moment.
                  </TableCell>
                </TableRow>
              ) : (
                pendingOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono">{order.reference}</TableCell>
                    <TableCell>{order.request?.buyer?.full_name || "—"}</TableCell>
                    <TableCell>{order.request?.country?.name || order.request?.country?.code || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{order.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/requests/${order.request_id}`}>Voir</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
