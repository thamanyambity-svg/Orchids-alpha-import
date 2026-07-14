"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  AlertTriangle, 
  Plus, 
  Search, 
  Loader2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DashboardHeader } from "@/components/dashboard/header"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"

export default function IncidentsPage() {
  const [loading, setLoading] = useState(true)
  const [incidents, setIncidents] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [isReporting, setIsReporting] = useState(false)
  const [open, setOpen] = useState(false)
  
  const [formData, setFormData] = useState({
    requestId: "",
    type: "LATE_DELIVERY",
    description: ""
  })

  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Fetch incidents reported by user
        const { data: incidentsData } = await supabase
          .from("incidents")
          .select(`
            *,
            import_requests:order_id (product_name, reference)
          `)
          .eq("reported_by", user.id)
          .order("created_at", { ascending: false })
        
        if (incidentsData) setIncidents(incidentsData)

        // Fetch requests for the dropdown
        const { data: requestsData } = await supabase
          .from("import_requests")
          .select("id, product_name, reference")
          .eq("buyer_id", user.id)
        
        if (requestsData) setRequests(requestsData)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  async function handleReportIncident() {
    if (!formData.requestId || !formData.description) {
      toast.error("Veuillez remplir tous les champs")
      return
    }

    setIsReporting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Non authentifié")

      const { data, error } = await supabase
        .from("incidents")
        .insert({
          order_id: formData.requestId,
          type: formData.type,
          description: formData.description,
          reported_by: user.id,
          status: "OPEN"
        })
        .select(`
          *,
          import_requests:order_id (product_name, reference)
        `)
        .single()

      if (error) throw error

      setIncidents([data, ...incidents])
      setOpen(false)
      setFormData({ requestId: "", type: "LATE_DELIVERY", description: "" })
      toast.success("Incident signalé avec succès. Notre équipe va l'analyser.")
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du signalement")
    } finally {
      setIsReporting(false)
    }
  }

  return (
    <div>
      <DashboardHeader 
        title="Incidents & Signalements" 
        subtitle="Signalez un problème avec une commande ou une transaction"
      />

      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Historique des incidents</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Signaler un incident
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Signaler un incident</DialogTitle>
                <DialogDescription>
                  Décrivez le problème rencontré. Notre support interviendra sous 24h.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Commande concernée</Label>
                  <Select 
                    value={formData.requestId} 
                    onValueChange={(v) => setFormData({...formData, requestId: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez une commande" />
                    </SelectTrigger>
                    <SelectContent>
                      {requests.map(req => (
                        <SelectItem key={req.id} value={req.id}>
                          {req.product_name} ({req.reference})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type d'incident</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(v) => setFormData({...formData, type: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Type de problème" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LATE_DELIVERY">Retard de livraison</SelectItem>
                      <SelectItem value="PRODUCT_ISSUE">Problème de qualité produit</SelectItem>
                      <SelectItem value="PAYMENT_ERROR">Erreur de paiement</SelectItem>
                      <SelectItem value="PARTNER_ISSUE">Problème avec le partenaire</SelectItem>
                      <SelectItem value="OTHER">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description détaillée</Label>
                  <Textarea 
                    placeholder="Détaillez le problème rencontré..."
                    className="min-h-[100px]"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleReportIncident}
                  disabled={isReporting}
                >
                  {isReporting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Envoyer le signalement
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {incidents.map((incident, index) => (
              <motion.div
                key={incident.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card border border-border p-4 rounded-xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      incident.status === 'RESOLVED' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                    }`}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold">{incident.type.replace('_', ' ')}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          incident.status === 'RESOLVED' 
                            ? 'border-success/20 bg-success/10 text-success' 
                            : 'border-destructive/20 bg-destructive/10 text-destructive'
                        }`}>
                          {incident.status === 'RESOLVED' ? 'Résolu' : 'En cours'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{incident.description}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {incident.import_requests?.reference || "N/A"}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(incident.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      {incident.decision && (
                        <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border text-xs">
                          <p className="font-bold mb-1 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-success" />
                            Décision AlphaIX:
                          </p>
                          {incident.decision}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {incidents.length === 0 && (
              <div className="p-12 text-center border-2 border-dashed border-border rounded-2xl">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <h3 className="font-semibold text-muted-foreground">Aucun incident signalé</h3>
                <p className="text-sm text-muted-foreground">
                  Nous espérons que vous n'en aurez jamais besoin !
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
