"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/lib/i18n-context"
import {
  Car, Truck, Settings, Gauge, Fuel, Zap, Calendar, MapPin,
  FileText, Key, Shield, CheckCircle2, Loader2, Plus, Minus,
  Trash2, Eye, Edit, Barcode, Wrench, Leaf, Thermometer
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"

const VEHICLE_TYPES = [
  { value: "NEUF", label: "Neuf", icon: Car },
  { value: "OCCASION", label: "Occasion", icon: Truck },
  { value: "PIECES_DETACHEES", label: "Pièces détachées", icon: Settings }
]

const CONDITIONS = [
  { value: "NEUF", label: "Neuf" },
  { value: "TRES_BON", label: "Très bon état" },
  { value: "BON", label: "Bon état" },
  { value: "MOYEN", label: "État moyen" },
  { value: "EPARGNE", label: "Épave / Pour pièces" }
]

const ENGINE_TYPES = [
  "Essence", "Diesel", "Hybride (HEV)", "Hybride rechargeable (PHEV)",
  "Électrique (BEV)", "Hydrogène (FCEV)", "GPL", "GNV", "Flex-Fuel", "Autre"
]

const TRANSMISSIONS = [
  "Manuelle 5 vitesses", "Manuelle 6 vitesses", "Automatique 6 rapports",
  "Automatique 8 rapports", "Automatique 9 rapports", "CVT", "DSG/DCT",
  "Séquentielle", "Autre"
]

const DRIVETRAINS = [
  "FWD (Traction)", "RWD (Propulsion)", "AWD (Intégrale permanente)",
  "4WD (Intégrale débrayable)", "4x4"
]

const FUEL_TYPES = [
  "Essence SP95/SP98", "Diesel B7/B10", "E85 (Superéthanol)",
  "GPL", "GNV", "Électricité", "Hydrogène", "Bi-carburation"
]

const REQUIRED_DOCS = [
  { key: "certificate_of_conformity", label: "Certificat de conformité (COC)" },
  { key: "registration_certificate", label: "Carte grise / Certificat d'immatriculation" },
  { key: "export_certificate", label: "Certificat d'exportation" },
  { key: "invoice", label: "Facture commerciale" },
  { key: "bill_of_lading", label: "Bill of Lading / LTA" },
  { key: "insurance_certificate", label: "Attestation d'assurance" },
  { key: "customs_declaration", label: "Déclaration douanière" },
  { key: "purchase_contract", label: "Contrat d'achat / Bon de commande" },
  { key: "origin_certificate", label: "Certificat d'origine" },
  { key: "eur1_certificate", label: "Certificat EUR.1 (préférentiel)" }
]

interface VehicleSpecFormProps {
  initialData?: any
  onChange: (data: any) => void
  readOnly?: boolean
  lineNumber: number
}

export function VehicleSpecForm({ initialData, onChange, readOnly, lineNumber }: VehicleSpecFormProps) {
  const { t } = useLanguage()
  const [formData, setFormData] = useState({
    vehicle_type: "OCCASION",
    brand: "",
    model: "",
    year: "",
    vin_prefix: "",
    engine_type: "",
    engine_displacement_cc: "",
    transmission: "",
    drivetrain: "",
    fuel_type: "",
    power_kw: "",
    power_hp: "",
    condition: "BON",
    mileage_km: "",
    first_registration_date: "",
    country_origin: "",
    equipment: [],
    color_exterior: "",
    color_interior: "",
    required_documents: REQUIRED_DOCS.map(d => d.key),
    quantity: 1,
    unit: "unit",
    target_price_usd: "",
    budget_min_usd: "",
    budget_max_usd: "",
    ...initialData
  })
  const [docChecks, setDocChecks] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }))
      if (initialData.required_documents) {
        const checks: Record<string, boolean> = {}
        initialData.required_documents.forEach((k: string) => { checks[k] = true })
        setDocChecks(checks)
      }
    }
  }, [initialData])

  const handleChange = (field: string, value: any) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)
    onChange(newData)
  }

  const toggleDoc = (docKey: string) => {
    const newChecks = { ...docChecks, [docKey]: !docChecks[docKey] }
    setDocChecks(newChecks)
    const newDocs = newChecks[docKey]
      ? formData.required_documents.filter((d: string) => d !== docKey)
      : [...formData.required_documents, docKey]
    handleChange("required_documents", newDocs)
  }

  const totalDocs = REQUIRED_DOCS.length
  const checkedDocs = Object.values(docChecks).filter(Boolean).length

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            {t("dashboard.requests.new.vehicle_line", "Fiche Véhicule")} #{lineNumber}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {t("dashboard.requests.new.vehicle_category", "Automobile & Pièces")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Separator />

        {/* Type véhicule */}
        <div className="space-y-3">
          <Label className="font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4" /> {t("dashboard.requests.new.vehicle_type", "Type de véhicule")}
          </Label>
          <div className="grid grid-cols-3 gap-3">
            {VEHICLE_TYPES.map(vt => (
              <Button
                key={vt.value}
                variant={formData.vehicle_type === vt.value ? "default" : "outline"}
                onClick={() => handleChange("vehicle_type", vt.value)}
                disabled={readOnly}
                className="flex flex-col items-center gap-2 p-4 h-auto"
              >
                <vt.icon className="w-6 h-6" />
                <span className="text-sm">{vt.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Identification */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>{t("dashboard.requests.new.brand", "Marque *")}</Label>
            <Select value={formData.brand} onValueChange={v => handleChange("brand", v)} disabled={readOnly}>
              <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
              <SelectContent>
                {["Toyota","Mercedes-Benz","BMW","Hyundai","Nissan","Mitsubishi","Ford","Lexus","Volkswagen","Range Rover","Peugeot","Renault","Citroën","Dacia","Kia","Mazda","Honda","Suzuki","Isuzu","Volvo","Audi","Porsche","Land Rover","Jeep","Chevrolet","GMC","Ram","Cadillac","Buick","Autre"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard.requests.new.model", "Modèle *")}</Label>
            <Input placeholder="Ex: Hilux, Land Cruiser, G-Class" value={formData.model} onChange={e => handleChange("model", e.target.value)} disabled={readOnly} />
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard.requests.new.year", "Année modèle *")}</Label>
            <Input type="number" min={1950} max={new Date().getFullYear() + 1} placeholder="Ex: 2023" value={formData.year} onChange={e => handleChange("year", e.target.value)} disabled={readOnly} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>{t("dashboard.requests.new.vin", "Préfixe VIN (premiers 8-10 caractères)")}</Label>
            <Input placeholder="Ex: JTEBU5JR" value={formData.vin_prefix} onChange={e => handleChange("vin_prefix", e.target.value.toUpperCase())} disabled={readOnly} className="font-mono" />
          </div>
        </div>

        {/* Technique */}
        <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border">
          <Label className="font-semibold flex items-center gap-2">
            <Gauge className="w-4 h-4" /> {t("dashboard.requests.new.technical_specs", "Spécifications techniques")}
          </Label>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>{t("dashboard.requests.new.engine_type", "Motorisation")}</Label>
              <Select value={formData.engine_type} onValueChange={v => handleChange("engine_type", v)} disabled={readOnly}>
                <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                <SelectContent>
                  {ENGINE_TYPES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("dashboard.requests.new.displacement", "Cylindrée (cc)")}</Label>
              <Input type="number" placeholder="Ex: 2755" value={formData.engine_displacement_cc} onChange={e => handleChange("engine_displacement_cc", e.target.value)} disabled={readOnly} />
            </div>
            <div className="space-y-2">
              <Label>{t("dashboard.requests.new.transmission", "Transmission")}</Label>
              <Select value={formData.transmission} onValueChange={v => handleChange("transmission", v)} disabled={readOnly}>
                <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                <SelectContent>
                  {TRANSMISSIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("dashboard.requests.new.drivetrain", "Transmission roues")}</Label>
              <Select value={formData.drivetrain} onValueChange={v => handleChange("drivetrain", v)} disabled={readOnly}>
                <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                <SelectContent>
                  {DRIVETRAINS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("dashboard.requests.new.fuel_type", "Carburant")}</Label>
              <Select value={formData.fuel_type} onValueChange={v => handleChange("fuel_type", v)} disabled={readOnly}>
                <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                <SelectContent>
                  {FUEL_TYPES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("dashboard.requests.new.power_kw", "Puissance (kW)")}</Label>
              <Input type="number" placeholder="Ex: 150" value={formData.power_kw} onChange={e => handleChange("power_kw", e.target.value)} disabled={readOnly} />
            </div>
            <div className="space-y-2">
              <Label>{t("dashboard.requests.new.power_hp", "Puissance (ch)")}</Label>
              <Input type="number" placeholder="Ex: 204" value={formData.power_hp} onChange={e => handleChange("power_hp", e.target.value)} disabled={readOnly} />
            </div>
          </div>
        </div>

        {/* État & Historique (si occasion) */}
        {formData.vehicle_type !== "NEUF" && (
          <div className="space-y-3 p-4 bg-amber-500/5 border-amber-500/20 border rounded-xl">
            <Label className="font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              {t("dashboard.requests.new.condition_history", "État & Historique (obligatoire pour occasion)")}
            </Label>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>{t("dashboard.requests.new.condition", "État général *")}</Label>
                <Select value={formData.condition} onValueChange={v => handleChange("condition", v)} disabled={readOnly}>
                  <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{t("dashboard.requests.new.mileage", "Kilométrage (km) *")}</Label>
                <Input type="number" min={0} placeholder="Ex: 85000" value={formData.mileage_km} onChange={e => handleChange("mileage_km", e.target.value)} disabled={readOnly} />
              </div>
              <div className="space-y-2">
                <Label>{t("dashboard.requests.new.first_reg", "1ère immatriculation *")}</Label>
                <Input type="date" value={formData.first_registration_date} onChange={e => handleChange("first_registration_date", e.target.value)} disabled={readOnly} />
              </div>
              <div className="space-y-2">
                <Label>{t("dashboard.requests.new.country_origin", "Pays d'origine")}</Label>
                <Input placeholder="Ex: Allemagne, Japon, USA" value={formData.country_origin} onChange={e => handleChange("country_origin", e.target.value)} disabled={readOnly} />
              </div>
            </div>
          </div>
        )}

        {/* Équipements & Couleurs */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("dashboard.requests.new.equipment", "Équipements & Options")}</Label>
            <Textarea
              placeholder={`Toit ouvrant, GPS, Caméra recul, Sièges chauffants, Jantes 18', Pack sécurité...`}
              value={formData.equipment.join(", ")}
              onChange={e => handleChange("equipment", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
              disabled={readOnly}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("dashboard.requests.new.color_ext", "Couleur extérieure")}</Label>
              <Input placeholder="Ex: Noir, Blanc, Gris métallisé" value={formData.color_exterior} onChange={e => handleChange("color_exterior", e.target.value)} disabled={readOnly} />
            </div>
            <div className="space-y-2">
              <Label>{t("dashboard.requests.new.color_int", "Couleur intérieure")}</Label>
              <Input placeholder="Ex: Noir cuir, Beige tissu" value={formData.color_interior} onChange={e => handleChange("color_interior", e.target.value)} disabled={readOnly} />
            </div>
          </div>
        </div>

        {/* Documents requis */}
        <div className="space-y-3 p-4 bg-blue-500/5 border-blue-500/20 border rounded-xl">
          <Label className="font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" />
            {t("dashboard.requests.new.required_docs", "Documents requis à l'import")} ({checkedDocs}/{totalDocs})
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {REQUIRED_DOCS.map(doc => (
              <label key={doc.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-blue-500/5 transition-colors">
                <Checkbox
                  checked={docChecks[doc.key] || false}
                  onCheckedChange={() => toggleDoc(doc.key)}
                  disabled={readOnly}
                />
                <span className="text-sm text-blue-700">{doc.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Quantités & Prix */}
        <div className="grid md:grid-cols-4 gap-4 pt-2 border-t border-border">
          <div className="space-y-2">
            <Label>{t("dashboard.requests.new.quantity", "Quantité")}</Label>
            <Input type="number" min={1} value={formData.quantity} onChange={e => handleChange("quantity", e.target.value)} disabled={readOnly} />
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard.requests.new.unit", "Unité")}</Label>
            <Select value={formData.unit} onValueChange={v => handleChange("unit", v)} disabled={readOnly}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unit">Unité</SelectItem>
                <SelectItem value="lot">Lot</SelectItem>
                <SelectItem value="set">Set</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>{t("dashboard.requests.new.target_price", "Prix cible ($/unité)")}</Label>
            <Input type="number" step="0.01" placeholder="Ex: 25000" value={formData.target_price_usd} onChange={e => handleChange("target_price_usd", e.target.value)} disabled={readOnly} />
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard.requests.new.budget_min", "Budget min ($)")}</Label>
            <Input type="number" step="0.01" placeholder="Min" value={formData.budget_min_usd} onChange={e => handleChange("budget_min_usd", e.target.value)} disabled={readOnly} />
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard.requests.new.budget_max", "Budget max ($)")}</Label>
            <Input type="number" step="0.01" placeholder="Max" value={formData.budget_max_usd} onChange={e => handleChange("budget_max_usd", e.target.value)} disabled={readOnly} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}