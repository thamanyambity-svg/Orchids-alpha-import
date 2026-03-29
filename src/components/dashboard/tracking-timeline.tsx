"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import {
    MapPin,
    Clock,
    Truck,
    CheckCircle2,
    AlertCircle,
    Plane,
    Package,
    FileText
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface TrackingEvent {
    id: string
    status: string
    location: string
    description: string
    event_date: string
}

interface TrackingTimelineProps {
    requestId: string
}

const statusOptions = [
    { value: "ORDER_PLACED", label: "Commande passée", icon: CheckCircle2 },
    { value: "PREPARING", label: "Préparation / Emballage", icon: Package },
    { value: "PICKUP", label: "Enlèvement (Usine)", icon: Truck },
    { value: "WAREHOUSE_ORIGIN", label: "Entrepôt Départ", icon: MapPin },
    { value: "CUSTOMS_EXPORT", label: "Douane Export", icon: FileText },
    { value: "DEPARTED_ORIGIN", label: "Départ Origine", icon: Plane },
    { value: "TRANSIT", label: "En Transit", icon: Clock },
    { value: "ARRIVED_DESTINATION", label: "Arrivée Destination", icon: MapPin },
    { value: "CUSTOMS_IMPORT", label: "Douane Import", icon: FileText },
    { value: "AVAILABLE_PICKUP", label: "Disponible pour retrait", icon: CheckCircle2 },
    { value: "DELIVERED", label: "Livré au client", icon: CheckCircle2 },
    { value: "DELAYED", label: "Retardé / Incident", icon: AlertCircle },
]

export function TrackingTimeline({ requestId }: TrackingTimelineProps) {
    const [events, setEvents] = useState<TrackingEvent[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function fetchEvents() {
            try {
                const { data, error } = await supabase
                    .from('tracking_events')
                    .select('*')
                    .eq('request_id', requestId)
                    .order('event_date', { ascending: false }) // Newest first

                if (error) throw error
                setEvents(data || [])
            } catch (error) {
                console.error("Error fetching tracking:", error)
            } finally {
                setLoading(false)
            }
        }

        if (requestId) fetchEvents()
    }, [requestId])

    if (loading) {
        return <div className="py-4 text-center text-sm text-muted-foreground">Chargement du suivi...</div>
    }

    if (events.length === 0) {
        return (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
                <Truck className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-20" />
                <p className="text-muted-foreground">Aucune information de suivi disponible pour le moment.</p>
            </div>
        )
    }

    return (
        <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                Suivi de l&apos;expédition
            </h3>

            <div className="space-y-8 pl-4 relative border-l-2 border-primary/20 ml-2">
                {events.map((event, index) => {
                    const statusOpt = statusOptions.find(o => o.value === event.status) || { label: event.status, icon: CheckCircle2 }
                    const Icon = statusOpt.icon
                    const isLatest = index === 0

                    return (
                        <div key={event.id} className="relative pl-8">
                            {/* Timeline Dot */}
                            <div className={`absolute -left-[11px] top-1 w-5 h-5 rounded-full border-4 border-background flex items-center justify-center ${isLatest ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                                {isLatest && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center flex-wrap gap-2">
                                    <span className={`font-bold ${isLatest ? 'text-primary text-lg' : 'text-foreground'}`}>
                                        {statusOpt.label}
                                    </span>
                                    {isLatest && <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5">Actuel</Badge>}
                                </div>

                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="w-3.5 h-3.5" />
                                    {format(new Date(event.event_date), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                                </div>

                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <MapPin className="w-3.5 h-3.5 text-primary" />
                                    {event.location}
                                </div>

                                {event.description && (
                                    <div className="mt-2 p-3 bg-muted/30 rounded-lg text-sm border border-border text-muted-foreground">
                                        {event.description}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
