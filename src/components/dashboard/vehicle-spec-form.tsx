"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/lib/i18n-context"
import { ChevronDown, ChevronUp, Shield, FileText } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

const ENGINE_TYPES = [
  "Essence", "Diesel", "Hybride (HEV)", "Hybride rechargeable (PHEV)",
  "Électrique (BEV)", "GPL", "GNV", "Hydrogène (FCEV)", "Autre"
]

const TRANSMISSIONS = [
  "Manuelle", "Automatique", "CVT", "DSG / DCT", "Séquentielle"
]

const DRIVETRAINS = [
  "FWD (Traction avant)", "RWD (Propulsion arrière)",
  "AWD (Intégrale permanente)", "4WD (4x4 débrayable)"
]

const CONDITIONS = [
  { value: "NEUF", label: "Neuf" },
  { value: "TRES_BON", label: "Très bon état" },
  { value: "BON", label: "Bon état" },
  { value: "MOYEN", label: "État moyen" },
]

const REQUIRED_DOCS = [
  { key: "coc", label: "Certificat de conformité (COC)" },
  { key: "invoice", label: "Facture commerciale" },
  { key: "export_cert", label: "Certificat d'exportation" },
  { key: "origin_cert", label: "Certificat d'origine" },
  { key: "bill_of_lading", label: "Connaissement / LTA" },
  { key: "insurance", label: "Attestation d'assurance" },
  { key: "customs_decl", label: "Déclaration en douane" },
]

interface VehicleSpecFormProps {
  initialData?: any
  onChange: (data: any) => void
  readOnly?: boolean
  lineNumber: number
}

export function VehicleSpecForm({ initialData, onChange, readOnly, lineNumber }: VehicleSpecFormProps) {
  const { t } = useLanguage()
  const [showOptional, setShowOptional] = useState(false)
  const [formData, setFormData] = useState({
    vehicle_type: "OCCASION",
    brand: "",
    model: "",
    year: "",
    engine_type: "",
    engine_displacement_cc: "",
    transmission: "",
    drivetrain: "",
    condition: "BON",
    mileage_km: "",
    first_registration_date: "",
    country_origin: "",
    color_exterior: "",
    color_interior: "",
    equipment_notes: "",
    required_documents: ["coc", "invoice", "export_cert", "origin_cert"] as string[],
    quantity: "1",
    unit: "unit",
    target_price_usd: "",
    budget_min_usd: "",
    budget_max_usd: "",
    hs_code: "",
    ...initialData
  })

  useEffect(() => {
    if (initialData) setFormData((prev: any) => ({ ...prev, ...initialData }))
  }, [initialData])

  const update = (field: string, value: any) => {
    const next = { ...formData, [field]: value }
    setFormData(next)
    onChange(next)
  }

  const toggleDoc = (key: string) => {
    const docs: string[] = formData.required_documents || []
    const next = docs.includes(key) ? docs.filter((d: string) => d !== key) : [...docs, key]
    update("required_documents", next)
  }

  const VEHICLE_TYPE_LABELS: Record<string, string> = {
    NEUF: t("spec.vehicle.new", "Neuf"),
    OCCASION: t("spec.vehicle.used", "Occasion"),
    PIECES_DETACHEES: t("spec.vehicle.parts", "Pièces détachées"),
  }

  const BRANDS = ["Toyota","Mercedes-Benz","BMW","Hyundai","Nissan","Mitsubishi",
    "Ford","Lexus","Volkswagen","Land Rover","Peugeot","Renault","Citroën","Kia",
    "Mazda","Honda","Suzuki","Isuzu","Volvo","Audi","Porsche","Jeep","Chevrolet","Autre"]

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">{lineNumber}</div>
          <div>
            <p className="font-semibold text-sm">{t("spec.vehicle.title", "Fiche Véhicule")}</p>
            <p className="text-xs text-muted-foreground">{t("spec.vehicle.subtitle", "Automobile & Équipement roulant")}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">{t("spec.vehicle.badge", "VÉHICULE")}</Badge>
      </div>

      <div className="p-6 space-y-6">
        {/* Type de véhicule */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.vehicle.type", "Type de commande")} *</Label>
          <div className="flex gap-2">
            {["NEUF","OCCASION","PIECES_DETACHEES"].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => update("vehicle_type", type)}
                disabled={readOnly}
                className={`flex-1 py-2 px-3 text-xs rounded-md border transition-colors font-medium ${formData.vehicle_type === type ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}
              >{VEHICLE_TYPE_LABELS[type]}</button>
            ))}
          </div>
        </div>

        {/* Identification */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.vehicle.brand", "Marque")} *</Label>
            <Select value={formData.brand} onValueChange={v => update("brand", v)} disabled={readOnly}>
              <SelectTrigger className="h-10"><SelectValue placeholder={t("spec.select", "Sélectionner...")} /></SelectTrigger>
              <SelectContent>{BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.vehicle.model", "Modèle")} *</Label>
            <Input placeholder="Ex. Hilux, G-Class, Land Cruiser" value={formData.model} onChange={e => update("model", e.target.value)} disabled={readOnly} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.vehicle.year", "Année modèle")} *</Label>
            <Input type="number" min={1990} max={new Date().getFullYear() + 1} placeholder="Ex. 2023" value={formData.year} onChange={e => update("year", e.target.value)} disabled={readOnly} className="h-10" />
          </div>
        </div>

        {/* Spécifications techniques */}
        <div className="rounded-lg border border-border p-4 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.vehicle.engine", "Motorisation")}</Label>
            <Select value={formData.engine_type} onValueChange={v => update("engine_type", v)} disabled={readOnly}>
              <SelectTrigger className="h-10"><SelectValue placeholder={t("spec.select", "Sélectionner...")} /></SelectTrigger>
              <SelectContent>{ENGINE_TYPES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.vehicle.displacement", "Cylindrée (cc)")}</Label>
            <Input type="number" placeholder="Ex. 2755" value={formData.engine_displacement_cc} onChange={e => update("engine_displacement_cc", e.target.value)} disabled={readOnly} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.vehicle.transmission", "Boîte de vitesses")}</Label>
            <Select value={formData.transmission} onValueChange={v => update("transmission", v)} disabled={readOnly}>
              <SelectTrigger className="h-10"><SelectValue placeholder={t("spec.select", "Sélectionner...")} /></SelectTrigger>
              <SelectContent>{TRANSMISSIONS.map(tx => <SelectItem key={tx} value={tx}>{tx}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.vehicle.drivetrain", "Transmission")}</Label>
            <Select value={formData.drivetrain} onValueChange={v => update("drivetrain", v)} disabled={readOnly}>
              <SelectTrigger className="h-10"><SelectValue placeholder={t("spec.select", "Sélectionner...")} /></SelectTrigger>
              <SelectContent>{DRIVETRAINS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {/* État & historique (si occasion) */}
        {formData.vehicle_type !== "NEUF" && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 grid md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.vehicle.condition", "État général")} *</Label>
              <Select value={formData.condition} onValueChange={v => update("condition", v)} disabled={readOnly}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>{CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.vehicle.mileage", "Kilométrage (km)")} *</Label>
              <Input type="number" min={0} placeholder="Ex. 85 000" value={formData.mileage_km} onChange={e => update("mileage_km", e.target.value)} disabled={readOnly} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.vehicle.first_reg", "1ère mise en circulation")}</Label>
              <Input type="date" value={formData.first_registration_date} onChange={e => update("first_registration_date", e.target.value)} disabled={readOnly} className="h-10" />
            </div>
          </div>
        )}

        {/* Budget */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.target_price", "Prix cible ($)")} *</Label>
            <Input type="number" step="0.01" placeholder="0.00" value={formData.target_price_usd} onChange={e => update("target_price_usd", e.target.value)} disabled={readOnly} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.budget_min", "Budget min ($)")} *</Label>
            <Input type="number" step="0.01" placeholder="0.00" value={formData.budget_min_usd} onChange={e => update("budget_min_usd", e.target.value)} disabled={readOnly} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.budget_max", "Budget max ($)")} *</Label>
            <Input type="number" step="0.01" placeholder="0.00" value={formData.budget_max_usd} onChange={e => update("budget_max_usd", e.target.value)} disabled={readOnly} className="h-10" />
          </div>
        </div>

        {/* Section optionnelle */}
        <button
          type="button"
          onClick={() => setShowOptional(!showOptional)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors w-full justify-between py-2 border-t border-border/50"
        >
          <span className="font-medium uppercase tracking-wide">{t("spec.optional", "Informations complémentaires (optionnel)")}</span>
          {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showOptional && (
          <div className="space-y-4 pt-2">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.vehicle.color_ext", "Couleur extérieure")}</Label>
                <Input placeholder="Ex. Noir, Blanc perle" value={formData.color_exterior} onChange={e => update("color_exterior", e.target.value)} disabled={readOnly} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.vehicle.color_int", "Couleur intérieure")}</Label>
                <Input placeholder="Ex. Noir cuir" value={formData.color_interior} onChange={e => update("color_interior", e.target.value)} disabled={readOnly} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.vehicle.country_origin", "Pays d'origine")}</Label>
                <Input placeholder="Ex. Allemagne, Japon" value={formData.country_origin} onChange={e => update("country_origin", e.target.value)} disabled={readOnly} className="h-10" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.vehicle.equipment", "Équipements & Options souhaités")}</Label>
              <Textarea
                placeholder={t("spec.vehicle.equipment_placeholder", "Ex. GPS, toit ouvrant, caméra de recul, sièges chauffants...")}
                value={formData.equipment_notes}
                onChange={e => update("equipment_notes", e.target.value)}
                disabled={readOnly}
                rows={2}
              />
            </div>
            {/* Documents requis */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <FileText className="w-3 h-3" />{t("spec.vehicle.required_docs", "Documents requis à l'importation")}
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {REQUIRED_DOCS.map(doc => (
                  <label key={doc.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <Checkbox
                      checked={(formData.required_documents || []).includes(doc.key)}
                      onCheckedChange={() => toggleDoc(doc.key)}
                      disabled={readOnly}
                    />
                    <span className="text-xs">{doc.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}