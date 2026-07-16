"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/lib/i18n-context"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import {
    MapPin,
    Calendar,
    Truck,
    Plus,
    Trash2,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Clock,
    Plane,
    Ship
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface TrackingEvent {
    id: string
    status: string
    location: string
    description: string
    event_date: string
    created_at: string
}

interface TrackingEditorProps {
    requestId: string
}

const statusOptions = [
    { value: "ORDER_PLACED", label: "Commande passée", labelKey: "admin.tracking.order_placed", icon: CheckCircle2 },
    { value: "PREPARING", label: "Préparation / Emballage", labelKey: "admin.tracking.preparing", icon: PackageIcon },
    { value: "PICKUP", label: "Enlèvement (Usine)", labelKey: "admin.tracking.pickup", icon: Truck },
    { value: "WAREHOUSE_ORIGIN", label: "Entrepôt Départ", labelKey: "admin.tracking.warehouse_origin", icon: BuildingIcon },
    { value: "CUSTOMS_EXPORT", label: "Douane Export", labelKey: "admin.tracking.customs_export", icon: FileTextIcon },
    { value: "DEPARTED_ORIGIN", label: "Départ Origine (Vol/Navire)", labelKey: "admin.tracking.departed_origin", icon: Plane },
    { value: "TRANSIT", label: "En Transit", labelKey: "admin.tracking.transit", icon: ArrowRightIcon },
    { value: "ARRIVED_DESTINATION", label: "Arrivée Destination", labelKey: "admin.tracking.arrived_destination", icon: MapPin },
    { value: "CUSTOMS_IMPORT", label: "Douane Import (Kinshasa)", labelKey: "admin.tracking.customs_import", icon: ScaleIcon },
    { value: "AVAILABLE_PICKUP", label: "Disponible pour retrait", labelKey: "admin.tracking.available_pickup", icon: CheckCircle2 },
    { value: "DELIVERED", label: "Livré au client", labelKey: "admin.tracking.delivered", icon: CheckCircle2 },
    { value: "DELAYED", label: "Retardé / Incident", labelKey: "admin.tracking.delayed", icon: AlertCircle },
]

// Icon helpers (using simple lucid icons for now to avoid import chaos)
function PackageIcon(props: any) { return <div {...props}><Truck className="w-4 h-4" /></div> }
function BuildingIcon(props: any) { return <div {...props}><MapPin className="w-4 h-4" /></div> }
function FileTextIcon(props: any) { return <div {...props}><CheckCircle2 className="w-4 h-4" /></div> }
function ArrowRightIcon(props: any) { return <div {...props}><Clock className="w-4 h-4" /></div> }
function ScaleIcon(props: any) { return <div {...props}><CheckCircle2 className="w-4 h-4" /></div> }


export function TrackingEditor({ requestId }: TrackingEditorProps) {
    const { t } = useLanguage()
    const [events, setEvents] = useState<TrackingEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const supabase = createClient()

    // New Event Form State
    const [formData, setFormData] = useState({
        status: "",
        location: "",
        description: "",
        event_date: new Date().toISOString().split('T')[0]
    })

    // Fetch Events
    const fetchEvents = async () => {
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
            toast.error(t("admin.tracking.load_error", "Impossible de charger le suivi"))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchEvents()
    }, [requestId])

    // Add Event
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            const { error } = await supabase
                .from('tracking_events')
                .insert({
                    request_id: requestId,
                    status: formData.status,
                    location: formData.location,
                    description: formData.description,
                    event_date: new Date(formData.event_date).toISOString()
                })

            if (error) throw error

            toast.success(t("admin.tracking.step_added", "Étape ajoutée avec succès"))
            setIsDialogOpen(false)
            setFormData({
                status: "",
                location: "",
                description: "",
                event_date: new Date().toISOString().split('T')[0]
            })
            fetchEvents() // Refresh list
        } catch (error: any) {
            toast.error(t("admin.tracking.error_prefix", "Erreur") + ": " + error.message)
        } finally {
            setSubmitting(false)
        }
    }

    // Delete Event
    const handleDelete = async (id: string) => {
        if (!confirm(t("admin.tracking.confirm_delete", "Voulez-vous vraiment supprimer cet événement ?"))) return

        try {
            const { error } = await supabase
                .from('tracking_events')
                .delete()
                .eq('id', id)

            if (error) throw error
            toast.success(t("admin.tracking.event_deleted", "Événement supprimé"))
            fetchEvents()
        } catch (error) {
            toast.error(t("admin.tracking.delete_error", "Erreur lors de la suppression"))
        }
    }

    return (
        <div className="rounded-2xl bg-card border border-border p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" />
                    {t("admin.tracking.title", "Suivi Logistique (Timeline)")}
                </h3>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            {t("admin.tracking.add_step", "Ajouter une étape")}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t("admin.tracking.add_tracking_step", "Ajouter une étape de suivi")}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>{t("admin.tracking.status_step_label", "Statut / Étape")}</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(val) => setFormData({ ...formData, status: val })}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("admin.tracking.select_step_placeholder", "Sélectionner l'étape")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statusOptions.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {t(opt.labelKey, opt.label)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>{t("admin.tracking.location_label", "Lieu")}</Label>
                                <Input
                                    placeholder={t("admin.tracking.location_placeholder", "Ex: Entrepôt Shenzhen, Aéroport IST...")}
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{t("admin.tracking.event_date_label", "Date de l'événement")}</Label>
                                <Input
                                    type="datetime-local"
                                    value={formData.event_date}
                                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{t("admin.tracking.description_label", "Description / Détails (Optionnel)")}</Label>
                                <Textarea
                                    placeholder={t("admin.tracking.description_placeholder", "Ex: Vol TK456 décollé, Retard douane...")}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <Button type="submit" className="w-full" disabled={submitting}>
                                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {t("admin.tracking.save", "Enregistrer")}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-6 pl-2 relative border-l-2 border-border/50 ml-3">
                {loading ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">{t("admin.tracking.loading", "Chargement...")}</div>
                ) : events.length === 0 ? (
                    <div className="py-8 pl-6 text-muted-foreground text-sm italic">
                        {t("admin.tracking.no_events", "Aucun événement de suivi enregistré pour le moment.")}
                    </div>
                ) : (
                    events.map((event) => {
                        const statusOpt = statusOptions.find(o => o.value === event.status) || { label: event.status, labelKey: "", icon: CheckCircle2 }
                        const Icon = statusOpt.icon

                        return (
                            <div key={event.id} className="relative pl-8 group">
                                {/* Dot on timeline */}
                                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-background border-2 border-primary" />

                                <div className="flex items-start justify-between bg-muted/20 p-3 rounded-lg border border-transparent hover:border-border transition-colors">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="font-semibold bg-background">
                                                {t(statusOpt.labelKey || "", statusOpt.label)}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {format(new Date(event.event_date), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <MapPin className="w-3 h-3 text-muted-foreground" />
                                            <span className="font-medium">{event.location}</span>
                                        </div>
                                        {event.description && (
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {event.description}
                                            </p>
                                        )}
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleDelete(event.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
