"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useLanguage } from "@/lib/i18n-context"
import { motion } from "framer-motion"
import {
  ArrowLeft, FileText, DollarSign, Truck, Plane, Ship,
  Loader2, ShieldCheck, AlertCircle, Calendar, MapPin,
  Plus, Minus, Trash2, Eye, Edit, Download, Save, Send,
  Package, Settings, Barcode, Box, Layers, Globe2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

const INCOTERMS = [
  { value: "EXW", label: "EXW - Ex Works (Usine)", description: "Acheteur prend en charge tout depuis l'usine vendeur" },
  { value: "FCA", label: "FCA - Free Carrier (Transporteur)", description: "Vendeur livre au transporteur désigné par l'acheteur" },
  { value: "FAS", label: "FAS - Free Alongside Ship (Le long du navire)", description: "Vendeur livre le long du navire au port d'embarquement" },
  { value: "FOB", label: "FOB - Free On Board (À bord)", description: "Vendeur charge à bord du navire au port d'embarquement" },
  { value: "CFR", label: "CFR - Cost and Freight (Coût et fret)", description: "Vendeur paie le fret jusqu'au port de destination" },
  { value: "CIF", label: "CIF - Cost, Insurance and Freight", description: "Vendeur paie fret + assurance jusqu'au port de destination" },
  { value: "CPT", label: "CPT - Carriage Paid To (Port payé jusqu'à)", description: "Vendeur paie transport jusqu'au lieu convenu" },
  { value: "CIP", label: "CIP - Carriage and Insurance Paid To", description: "Vendeur paie transport + assurance jusqu'au lieu convenu" },
  { value: "DAP", label: "DAP - Delivered At Place (Livré au lieu)", description: "Vendeur livre au lieu convenu, non déchargé" },
  { value: "DPU", label: "DPU - Delivered at Place Unloaded", description: "Vendeur livre et décharge au lieu convenu" },
  { value: "DDP", label: "DDP - Delivered Duty Paid (Droits acquittés)", description: "Vendeur livre avec tous droits/taxes payés" }
]

interface QuoteSubmissionFormProps {
  requestId: string
  requestData: any
  onSubmit: (quoteData: any) => Promise<void>
  onCancel: () => void
}

export function QuoteSubmissionForm({ requestId, requestData, onSubmit, onCancel }: QuoteSubmissionFormProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("pricing")
  const [countries, setCountries] = useState<any[]>([])
  const supabase = createClient()

  const [quoteData, setQuoteData] = useState({
    unit_price_usd: "",
    quantity: requestData.quantity || 1,
    currency: "USD",
    freight_cost_usd: "0",
    insurance_cost_usd: "0",
    customs_duty_estimate_usd: "0",
    inspection_cost_usd: "0",
    handling_fees_usd: "0",
    other_fees_usd: "0",
    incoterm: "FOB",
    port_loading: "",
    port_discharge: "",
    estimated_transit_days: "",
    estimated_departure_date: "",
    estimated_arrival_date: "",
    payment_terms: "60% deposit, 40% against documents",
    validity_days: 30,
    specifications_json: {},
    notes: "",
    proforma_pdf_url: "",
  })

  useEffect(() => {
    async function fetchCountries() {
      const { data } = await supabase.from("countries").select("*").eq("is_active", true).order("name")
      if (data) setCountries(data)
    }
    fetchCountries()
  }, [])

  const handleChange = (field: string, value: any) => {
    setQuoteData(prev => ({ ...prev, [field]: value }))
  }

  const calculateTotals = () => {
    const unitPrice = parseFloat(quoteData.unit_price_usd) || 0
    const quantity = parseInt(quoteData.quantity) || 1
    const subtotal = unitPrice * quantity
    
    const fees = [
      "freight_cost_usd", "insurance_cost_usd", "customs_duty_estimate_usd",
      "inspection_cost_usd", "handling_fees_usd", "other_fees_usd"
    ].reduce((sum, f) => sum + (parseFloat(quoteData[f as keyof typeof quoteData]) || 0), 0)
    
    return { subtotal, fees, grandTotal: subtotal + fees }
  }

  const totals = calculateTotals()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quoteData.unit_price_usd || parseFloat(quoteData.unit_price_usd) <= 0) {
      toast.error("Prix unitaire requis")
      return
    }
    setIsLoading(true)
    try {
      await onSubmit({
        ...quoteData,
        subtotal_usd: totals.subtotal,
        total_fees_usd: totals.fees,
        grand_total_usd: totals.grandTotal,
        request_id: requestId,
      })
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("dashboard.partner.quote_title", "Soumettre Devis / Proforma")}</h2>
          <p className="text-muted-foreground">{requestData.reference} • {requestData.category}</p>
        </div>
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          <ArrowLeft className="w-4 h-4 mr-2" /> {t("common.cancel", "Annuler")}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pricing">{t("dashboard.partner.quote_tab_pricing", "Prix & Frais")}</TabsTrigger>
          <TabsTrigger value="logistics">{t("dashboard.partner.quote_tab_logistics", "Logistique")}</TabsTrigger>
          <TabsTrigger value="terms">{t("dashboard.partner.quote_tab_terms", "Conditions")}</TabsTrigger>
          <TabsTrigger value="specs">{t("dashboard.partner.quote_tab_specs", "Specs")}</TabsTrigger>
        </TabsList>

        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5" /> {t("dashboard.partner.pricing", "Prix Unitaire & Quantité")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t("dashboard.partner.unit_price", "Prix Unitaire ($) *")}</Label>
                  <Input type="number" step="0.01" min="0.01" placeholder="Ex: 12.50" value={quoteData.unit_price_usd} onChange={e => handleChange("unit_price_usd", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("dashboard.partner.quantity", "Quantité *")}</Label>
                  <Input type="number" min="1" placeholder="Ex: 1000" value={quoteData.quantity} onChange={e => handleChange("quantity", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("dashboard.partner.currency", "Devise")}</Label>
                  <Select value={quoteData.currency} onValueChange={v => handleChange("currency", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="CNY">CNY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <h4 className="font-semibold flex items-center gap-2"><Truck className="w-4 h-4" /> {t("dashboard.partner.freight_costs", "Frais de Transport & Logistique")}</h4>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t("dashboard.partner.freight", "Fret ($)")}</Label>
                  <Input type="number" step="0.01" min="0" value={quoteData.freight_cost_usd} onChange={e => handleChange("freight_cost_usd", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("dashboard.partner.insurance", "Assurance ($)")}</Label>
                  <Input type="number" step="0.01" min="0" value={quoteData.insurance_cost_usd} onChange={e => handleChange("insurance_cost_usd", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("dashboard.partner.customs_duty", "Droits Douane Estimés ($)")}</Label>
                  <Input type="number" step="0.01" min="0" value={quoteData.customs_duty_estimate_usd} onChange={e => handleChange("customs_duty_estimate_usd", e.target.value)} />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t("dashboard.partner.inspection", "Inspection ($)")}</Label>
                  <Input type="number" step="0.01" min="0" value={quoteData.inspection_cost_usd} onChange={e => handleChange("inspection_cost_usd", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("dashboard.partner.handling", "Manutention ($)")}</Label>
                  <Input type="number" step="0.01" min="0" value={quoteData.handling_fees_usd} onChange={e => handleChange("handling_fees_usd", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("dashboard.partner.other_fees", "Autres Frais ($)")}</Label>
                  <Input type="number" step="0.01" min="0" value={quoteData.other_fees_usd} onChange={e => handleChange("other_fees_usd", e.target.value)} />
                </div>
              </div>

              <Separator />

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="grid md:grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("dashboard.partner.subtotal", "Sous-total Produits")}</p>
                    <p className="text-2xl font-bold">${totals.subtotal.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("dashboard.partner.total_fees", "Total Frais")}</p>
                    <p className="text-2xl font-bold text-amber-600">${totals.fees.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("dashboard.partner.grand_total", "TOTAL FINAL")}</p>
                    <p className="text-2xl font-bold text-primary">${totals.grandTotal.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logistics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe2 className="w-5 h-5" /> {t("dashboard.partner.incoterms_logistics", "Incoterm & Logistique")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>{t("dashboard.partner.incoterm", "Incoterm *")}</Label>
                <Select value={quoteData.incoterm} onValueChange={v => handleChange("incoterm", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INCOTERMS.map(i => (
                      <SelectItem key={i.value} value={i.value}>
                        <div>
                          <p className="font-medium">{i.label}</p>
                          <p className="text-xs text-muted-foreground">{i.description}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">{t("dashboard.partner.incoterm_help", "Choisissez selon qui paie quoi (transport, assurance, douane). FOB/CIF recommandés pour import maritime.")}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("dashboard.partner.port_loading", "Port d'Embarquement")}</Label>
                  <Input placeholder="Ex: Shanghai, Shenzhen, Dubaï, Istanbul..." value={quoteData.port_loading} onChange={e => handleChange("port_loading", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("dashboard.partner.port_discharge", "Port de Débarquement")}</Label>
                  <Input placeholder="Ex: Kinshasa, Matadi, Pointe-Noire..." value={quoteData.port_discharge} onChange={e => handleChange("port_discharge", e.target.value)} />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t("dashboard.partner.transit_days", "Jours de Transit Estimés")}</Label>
                  <Input type="number" min="1" placeholder="Ex: 35" value={quoteData.estimated_transit_days} onChange={e => handleChange("estimated_transit_days", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("dashboard.partner.departure_date", "Date Départ Estimée")}</Label>
                  <Input type="date" value={quoteData.estimated_departure_date} onChange={e => handleChange("estimated_departure_date", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("dashboard.partner.arrival_date", "Date Arrivée Estimée")}</Label>
                  <Input type="date" value={quoteData.estimated_arrival_date} onChange={e => handleChange("estimated_arrival_date", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> {t("dashboard.partner.payment_terms", "Conditions de Paiement & Validité")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("dashboard.partner.payment_terms", "Conditions de Paiement")}</Label>
                <Textarea placeholder="Ex: 60% acompte à la commande, 40% contre documents (B/L, Facture, Certificat origine)..." value={quoteData.payment_terms} onChange={e => handleChange("payment_terms", e.target.value)} rows={3} />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("dashboard.partner.validity_days", "Validité Devis (jours)")}</Label>
                  <Input type="number" min="1" max="90" value={quoteData.validity_days} onChange={e => handleChange("validity_days", e.target.value)} />
                </div>
              </div>
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <p className="text-sm text-amber-700 font-medium">{t("dashboard.partner.quote_validity_note", "Le devis sera valable 30 jours par défaut. Passé ce délai, une nouvelle proposition sera nécessaire.")}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> {t("dashboard.partner.cgv_note", "Conditions Générales de Vente AlphaIX")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted/30 rounded-xl border border-border text-sm space-y-2">
                <p className="font-semibold">{t("dashboard.partner.cgv_applicable", "CGV AlphaIX s'appliquent automatiquement")}</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>{t("dashboard.partner.cgv_1", "Paiement sécurisé via compte séquestre AlphaIX")}</li>
                  <li>{t("dashboard.partner.cgv_2", "60% acompte à la commande, 40% à la livraison documents")}</li>
                  <li>{t("dashboard.partner.cgv_3", "Annulation possible sous 48h après signature bon de commande")}</li>
                  <li>{t("dashboard.partner.cgv_4", "Inspection pré-embarquement incluse (sauf clause contraire)")}</li>
                  <li>{t("dashboard.partner.cgv_5", "Litiges : médiation puis tribunaux compétents")}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Layers className="w-5 h-5" /> {t("dashboard.partner.specifications", "Spécifications Techniques & Notes")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("dashboard.partner.specs_json", "Spécifications (JSON)")}</Label>
                <Textarea
                  placeholder='{"matiere": "100% Coton", "grammage": "180gsm", "couleur": "Pantone 19-4052"}'
                  value={JSON.stringify(quoteData.specifications_json, null, 2)}
                  onChange={e => {
                    try { handleChange("specifications_json", JSON.parse(e.target.value)) } catch {}
                  }}
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("dashboard.partner.notes", "Notes pour l'acheteur")}</Label>
                <Textarea placeholder="Délais spécifiques, conditions particulières, recommandations..." value={quoteData.notes} onChange={e => handleChange("notes", e.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>{t("dashboard.partner.proforma_pdf", "Proforma PDF (URL)")}</Label>
                <Input placeholder="https://.../proforma-XXX.pdf" value={quoteData.proforma_pdf_url} onChange={e => handleChange("proforma_pdf_url", e.target.value)} />
                <p className="text-xs text-muted-foreground">{t("dashboard.partner.upload_pdf_note", "Uploadez le PDF sur Supabase Storage puis collez l'URL publique ici.")}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <div className="flex justify-end gap-4 pt-4 border-t border-border">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            {t("common.cancel", "Annuler")}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="gap-2" size="lg">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {t("dashboard.partner.submit_quote", "Envoyer le Devis à l'Acheteur")}
          </Button>
        </div>
      </Tabs>
    </motion.div>
  )
}