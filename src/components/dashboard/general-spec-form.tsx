"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/lib/i18n-context"
import {
  Package, Tag, Scale, Globe, Shield, CheckCircle2,
  Loader2, Barcode, Layers, Box, Palette, Download, Trash2, Plus
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

const COMMON_CERTIFICATIONS = [
  "CE", "FDA", "RoHS", "REACH", "ISO 9001", "ISO 14001",
  "ISO 13485", "ISO 22000", "HACCP", "UL", "CSA", "FCC",
  "CCC", "GS", "TÜV", "VDE", "EAC", "SAA", "PSE", "KC",
  "BIS", "SNI", "SASO", "GOST-R", "INMETRO", "Autre"
]

const PACKAGING_TYPES = [
  "Carton standard", "Carton renforcé", "Caisse bois", "Caisse palette",
  "Big Bag", "Sac papier", "Sac plastique", "Fût métal", "Fût plastique",
  "IBC (Container vrac)", "Palettisé", "Vrac", "Autre"
]

interface GeneralSpecFormProps {
  initialData?: any
  onChange: (data: any) => void
  readOnly?: boolean
  lineNumber: number
}

export function GeneralSpecForm({ initialData, onChange, readOnly, lineNumber }: GeneralSpecFormProps) {
  const { t } = useLanguage()
  const [formData, setFormData] = useState({
    product_name: "",
    category: "",
    description: "",
    specifications_json: {},
    required_certifications: [],
    hs_code: "",
    packaging_type: "",
    units_per_carton: "",
    carton_dimensions_cm: { L: "", W: "", H: "" },
    carton_weight_kg: "",
    quantity: 1,
    unit: "units",
    target_price_usd: "",
    budget_min_usd: "",
    budget_max_usd: "",
    ...initialData
  })
  const [certChecks, setCertChecks] = useState<Record<string, boolean>>({})
  const [specsEntries, setSpecsEntries] = useState<Array<{key: string, value: string}>>([])

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }))
      if (initialData.required_certifications) {
        const checks: Record<string, boolean> = {}
        initialData.required_certifications.forEach((c: string) => { checks[c] = true })
        setCertChecks(checks)
      }
      if (initialData.specifications_json) {
        const entries = Object.entries(initialData.specifications_json).map(([k, v]) => ({ key: k, value: String(v) }))
        setSpecsEntries(entries)
      }
      if (initialData.carton_dimensions_cm) {
        // Already in formData
      }
    }
  }, [initialData])

  const handleChange = (field: string, value: any) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)
    onChange(newData)
  }

  const handleNestedChange = (parent: string, child: string, value: string) => {
    const newData = { ...formData, [parent]: { ...formData[parent], [child]: value } }
    setFormData(newData)
    onChange(newData)
  }

  const toggleCert = (cert: string) => {
    const newChecks = { ...certChecks, [cert]: !certChecks[cert] }
    setCertChecks(newChecks)
    const newCerts = newChecks[cert]
      ? formData.required_certifications.filter((c: string) => c !== cert)
      : [...formData.required_certifications, cert]
    handleChange("required_certifications", newCerts)
  }

  const addSpecEntry = () => {
    setSpecsEntries([...specsEntries, { key: "", value: "" }])
  }

  const updateSpecEntry = (index: number, field: "key" | "value", value: string) => {
    const newEntries = [...specsEntries]
    newEntries[index] = { ...newEntries[index], [field]: value }
    setSpecsEntries(newEntries)
    const newSpecs: Record<string, string> = {}
    newEntries.forEach(e => { if (e.key) newSpecs[e.key] = e.value })
    handleChange("specifications_json", newSpecs)
  }

  const removeSpecEntry = (index: number) => {
    const newEntries = specsEntries.filter((_, i) => i !== index)
    setSpecsEntries(newEntries)
    const newSpecs: Record<string, string> = {}
    newEntries.forEach(e => { if (e.key) newSpecs[e.key] = e.value })
    handleChange("specifications_json", newSpecs)
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            {t("dashboard.requests.new.general_line", "Fiche Produit")} #{lineNumber}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {t("dashboard.requests.new.general_category", "Produit Général")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Separator />

        {/* Identification */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>{t("dashboard.requests.new.product_name", "Nom du produit *")}</Label>
            <Input
              placeholder={t("dashboard.requests.new.product_placeholder", "Ex: iPhone 15 Pro Max 256GB / Pompe centrifuge 50m³/h")}
              value={formData.product_name}
              onChange={e => handleChange("product_name", e.target.value)}
              disabled={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard.requests.new.category", "Catégorie *")}</Label>
            <Input placeholder="Ex: Électronique, Pièces auto, Cosmétiques" value={formData.category} onChange={e => handleChange("category", e.target.value)} disabled={readOnly} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>{t("dashboard.requests.new.description", "Description détaillée")}</Label>
            <Textarea
              placeholder="Caractéristiques techniques, matériaux, usage, particularités..."
              value={formData.description}
              onChange={e => handleChange("description", e.target.value)}
              disabled={readOnly}
              rows={3}
            />
          </div>
        </div>

        {/* Spécifications techniques flexibles (clé/valeur) */}
        <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border">
          <Label className="font-semibold flex items-center gap-2">
            <Layers className="w-4 h-4" /> {t("dashboard.requests.new.technical_specs", "Spécifications techniques (clé / valeur)")}
          </Label>
          <div className="space-y-2">
            {specsEntries.map((entry, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="Clé (ex: Tension, Puissance, Matériau)"
                  value={entry.key}
                  onChange={e => updateSpecEntry(index, "key", e.target.value)}
                  disabled={readOnly}
                  className="flex-1"
                />
                <Input
                  placeholder="Valeur (ex: 220V, 1500W, Acier inox 316L)"
                  value={entry.value}
                  onChange={e => updateSpecEntry(index, "value", e.target.value)}
                  disabled={readOnly}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSpecEntry(index)}
                  disabled={readOnly || specsEntries.length <= 1}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addSpecEntry} disabled={readOnly} className="w-fit">
              <Plus className="w-4 h-4 mr-1" /> {t("dashboard.requests.new.add_spec", "Ajouter une spécification")}
            </Button>
          </div>
        </div>

        {/* Certifications & Normes */}
        <div className="space-y-3 p-4 bg-green-500/5 border-green-500/20 border rounded-xl">
          <Label className="font-semibold flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 text-green-500" />
            {t("dashboard.requests.new.certifications", "Certifications & Normes requises")}
          </Label>
          <div className="flex flex-wrap gap-2">
            {COMMON_CERTIFICATIONS.map(cert => (
              <label key={cert} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-green-500/5 transition-colors">
                <Checkbox
                  checked={certChecks[cert] || false}
                  onCheckedChange={() => toggleCert(cert)}
                  disabled={readOnly}
                />
                <span className="text-sm font-medium text-green-700">{cert}</span>
              </label>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const custom = prompt("Nom de la certification :")
                if (custom) toggleCert(custom)
              }}
              disabled={readOnly}
              className="text-xs"
            >
              <Plus className="w-3 h-3 mr-1" /> {t("dashboard.requests.new.add_custom", "Autre...")}
            </Button>
          </div>
        </div>

        {/* Code Douanier & Emballage */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>{t("dashboard.requests.new.hs_code", "Code HS Douanier (6-10 chiffres)")}</Label>
            <Input
              placeholder="Ex: 8517.12.00 (Téléphones) / 8703.23 (Véhicules)"
              value={formData.hs_code}
              onChange={e => handleChange("hs_code", e.target.value.toUpperCase())}
              disabled={readOnly}
              className="font-mono"
              maxLength={10}
            />
            <p className="text-xs text-muted-foreground">Code SH international - 6 premiers chiffres harmonisés</p>
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard.requests.new.packaging", "Type emballage")}</Label>
            <Select value={formData.packaging_type} onValueChange={v => handleChange("packaging_type", v)} disabled={readOnly}>
              <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
              <SelectContent>
                {PACKAGING_TYPES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard.requests.new.units_per_carton", "Unités / carton")}</Label>
            <Input type="number" min={1} placeholder="Ex: 50" value={formData.units_per_carton} onChange={e => handleChange("units_per_carton", e.target.value)} disabled={readOnly} />
          </div>
        </div>

        {/* Dimensions carton */}
        <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border">
          <Label className="font-semibold flex items-center gap-2">
            <Box className="w-4 h-4" /> {t("dashboard.requests.new.carton_dims", "Dimensions & Poids carton")}
          </Label>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>{t("dashboard.requests.new.length", "Longueur (cm)")}</Label>
              <Input type="number" step="0.1" placeholder="L" value={formData.carton_dimensions_cm?.L || ""} onChange={e => handleNestedChange("carton_dimensions_cm", "L", e.target.value)} disabled={readOnly} />
            </div>
            <div className="space-y-2">
              <Label>{t("dashboard.requests.new.width", "Largeur (cm)")}</Label>
              <Input type="number" step="0.1" placeholder="W" value={formData.carton_dimensions_cm?.W || ""} onChange={e => handleNestedChange("carton_dimensions_cm", "W", e.target.value)} disabled={readOnly} />
            </div>
            <div className="space-y-2">
              <Label>{t("dashboard.requests.new.height", "Hauteur (cm)")}</Label>
              <Input type="number" step="0.1" placeholder="H" value={formData.carton_dimensions_cm?.H || ""} onChange={e => handleNestedChange("carton_dimensions_cm", "H", e.target.value)} disabled={readOnly} />
            </div>
            <div className="space-y-2">
              <Label>{t("dashboard.requests.new.carton_weight", "Poids (kg)")}</Label>
              <Input type="number" step="0.01" placeholder="Poids brut" value={formData.carton_weight_kg} onChange={e => handleChange("carton_weight_kg", e.target.value)} disabled={readOnly} />
            </div>
          </div>
        </div>

        {/* Quantités & Prix */}
        <div className="grid md:grid-cols-4 gap-4 pt-2 border-t border-border">
          <div className="space-y-2">
            <Label>{t("dashboard.requests.new.quantity", "Quantité *")}</Label>
            <Input type="number" min={1} value={formData.quantity} onChange={e => handleChange("quantity", e.target.value)} disabled={readOnly} />
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard.requests.new.unit", "Unité *")}</Label>
            <Select value={formData.unit} onValueChange={v => handleChange("unit", v)} disabled={readOnly}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="units">Unités</SelectItem>
                <SelectItem value="kg">Kg</SelectItem>
                <SelectItem value="tons">Tonnes</SelectItem>
                <SelectItem value="cartons">Cartons</SelectItem>
                <SelectItem value="pallets">Palettes</SelectItem>
                <SelectItem value="m2">m²</SelectItem>
                <SelectItem value="m3">m³</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>{t("dashboard.requests.new.target_price", "Prix cible ($/unité)")}</Label>
            <Input type="number" step="0.01" placeholder="Ex: 4.50" value={formData.target_price_usd} onChange={e => handleChange("target_price_usd", e.target.value)} disabled={readOnly} />
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