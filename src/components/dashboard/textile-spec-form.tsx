"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/lib/i18n-context"
import {
  Shirt, Tag, Scale, Palette, Box, Grid, Layers,
  CheckCircle2, AlertCircle, Plus, Minus, Trash2, Shield
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

const TEXTILE_CATEGORIES = [
  "T-shirt / Haut", "Pantalon / Bas", "Robe / Jupes", "Veste / Manteau",
  "Sous-vêtements", "Chaussettes / Collants", "Maillots de bain",
  "Vêtements de sport", "Uniformes / Workwear", "Tissu au mètre",
  "Accessoires (écharpes, bonnets, gants)", "Autre textile"
]

const COMPOSITIONS = [
  "100% Coton", "100% Polyester", "100% Lin", "100% Soie", "100% Laine",
  "100% Viscose", "100% Tencel / Lyocell", "100% Modal",
  "65% Polyester / 35% Coton", "50% Coton / 50% Polyester",
  "95% Coton / 5% Élasthanne", "90% Polyester / 10% Élasthanne",
  "80% Coton / 20% Polyester", "70% Viscose / 30% Lin",
  "Mélange laine / acrylique", "Autre mélange"
]

const CERTIFICATIONS = [
  "Oeko-Tex Standard 100", "GOTS (Global Organic Textile Standard)",
  "GRS (Global Recycled Standard)", "RCS (Recycled Claim Standard)",
  "Fair Trade", "BSCI", "SA8000", "ISO 9001", "ISO 14001",
  "REACH Compliance", "CPSIA", "California Prop 65",
  "Bluesign", "Cradle to Cradle", "Autre"
]

const PACKAGING_TYPES = [
  "Polybag individuel", "Polybag + carton", "Boîte cadeau",
  "Suspendu (cintre)", "Plis plat", "Roulé", "Sous vide",
  "Autre"
]

const SIZE_STANDARDS = [
  { value: "EU", label: "EU (34-56)", sizes: ["34","36","38","40","42","44","46","48","50","52","54","56"] },
  { value: "US", label: "US (XS-3XL)", sizes: ["XS","S","M","L","XL","2XL","3XL"] },
  { value: "UK", label: "UK (6-22)", sizes: ["6","8","10","12","14","16","18","20","22"] },
  { value: "INT", label: "International (XS-3XL)", sizes: ["XS","S","M","L","XL","2XL","3XL"] },
  { value: "CM", label: "Tour de poitrine (cm)", sizes: ["80","84","88","92","96","100","104","108","112","116"] },
  { value: "CUSTOM", label: "Personnalisé", sizes: [] }
]

interface TextileSpecFormProps {
  initialData?: any
  onChange: (data: any) => void
  readOnly?: boolean
  lineNumber: number
}

export function TextileSpecForm({ initialData, onChange, readOnly, lineNumber }: TextileSpecFormProps) {
  const { t } = useLanguage()
  const [formData, setFormData] = useState({
    product_name: "",
    category: "",
    composition: "",
    weight_gsm: "",
    color_pantone: "",
    size_standard: "EU",
    sizes: {},
    total_quantity: "",
    unit: "pcs",
    quality_standard: "",
    labeling_requirements: "",
    packaging_type: "",
    packing_per_carton: "",
    target_price_usd: "",
    budget_min_usd: "",
    budget_max_usd: "",
    ...initialData
  })
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }))
      if (initialData.sizes) {
        const sq: Record<string, string> = {}
        Object.entries(initialData.sizes).forEach(([size, qty]) => {
          sq[size] = String(qty)
        })
        setSizeQuantities(sq)
      }
    }
  }, [initialData])

  const handleChange = (field: string, value: any) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)
    onChange(newData)
  }

  const handleSizeQty = (size: string, qty: string) => {
    const newSq = { ...sizeQuantities, [size]: qty }
    setSizeQuantities(newSq)
    const newSizes = { ...formData.sizes }
    if (qty && qty !== "0") newSizes[size] = parseInt(qty)
    else delete newSizes[size]
    handleChange("sizes", newSizes)
  }

  const getSizeList = () => {
    const standard = SIZE_STANDARDS.find(s => s.value === formData.size_standard)
    return standard?.sizes || []
  }

  const toggleStandard = (std: string) => {
    handleChange("size_standard", std)
    const sizes = SIZE_STANDARDS.find(s => s.value === std)?.sizes || []
    const newSq: Record<string, string> = {}
    const newSizes: Record<string, number> = {}
    sizes.forEach(s => {
      newSq[s] = sizeQuantities[s] || "0"
      if (sizeQuantities[s] && sizeQuantities[s] !== "0") {
        newSizes[s] = parseInt(sizeQuantities[s])
      }
    })
    setSizeQuantities(newSq)
    handleChange("sizes", newSizes)
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shirt className="w-5 h-5 text-primary" />
            {t("dashboard.requests.new.textile_line", "Fiche Textile")} #{lineNumber}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {t("dashboard.requests.new.textile_category", "Textile & Habillement")}
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
              placeholder={t("dashboard.requests.new.textile_product_placeholder", "Ex: T-shirt col rond 180gsm")}
              value={formData.product_name}
              onChange={e => handleChange("product_name", e.target.value)}
              disabled={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard.requests.new.textile_category", "Catégorie *")}</Label>
            <Select value={formData.category} onValueChange={v => handleChange("category", v)} disabled={readOnly}>
              <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
              <SelectContent>
                {TEXTILE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard.requests.new.composition", "Composition *")}</Label>
            <Select value={formData.composition} onValueChange={v => handleChange("composition", v)} disabled={readOnly}>
              <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
              <SelectContent>
                {COMPOSITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard.requests.new.weight_gsm", "Grammage (g/m²)")}</Label>
            <Input type="number" placeholder="Ex: 180" value={formData.weight_gsm} onChange={e => handleChange("weight_gsm", e.target.value)} disabled={readOnly} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>{t("dashboard.requests.new.color_pantone", "Code couleur (Pantone / RAL / Référence fournisseur)")}</Label>
            <Input placeholder="Ex: 19-4052 TCX (Classic Blue)" value={formData.color_pantone} onChange={e => handleChange("color_pantone", e.target.value)} disabled={readOnly} />
          </div>
        </div>

        {/* Tailles & Quantités */}
        <div className="space-y-4 p-4 bg-muted/30 rounded-xl border border-border">
          <Label className="font-semibold flex items-center gap-2">
            <Grid className="w-4 h-4" /> {t("dashboard.requests.new.sizes_quantities", "Tailles & Quantités par taille")}
          </Label>
          
          {/* Standard de tailles */}
          <div className="space-y-2">
            <Label>{t("dashboard.requests.new.size_standard", "Standard de tailles")}</Label>
            <div className="flex flex-wrap gap-2">
              {SIZE_STANDARDS.map(std => (
                <Button
                  key={std.value}
                  variant={formData.size_standard === std.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleStandard(std.value)}
                  disabled={readOnly}
                  className="flex items-center gap-1"
                >
                  {std.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Grille tailles */}
          {getSizeList().length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
              {getSizeList().map(size => (
                <div key={size} className="flex flex-col items-center gap-1 p-2 bg-card border border-border rounded-lg">
                  <span className="text-xs font-medium text-muted-foreground">{size}</span>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={sizeQuantities[size] || ""}
                    onChange={e => handleSizeQty(size, e.target.value)}
                    disabled={readOnly}
                    className="w-full text-center text-sm h-8"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Total quantity auto-calculé */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <Label className="font-semibold">{t("dashboard.requests.new.total_qty", "Quantité totale")}</Label>
            <Input
              type="number"
              readOnly
              value={Object.values(sizeQuantities).reduce((sum, q) => sum + (parseInt(q) || 0), 0)}
              className="w-[120px] bg-muted text-center font-bold"
            />
            <span className="text-sm text-muted-foreground">(Auto-calculé depuis les tailles)</span>
          </div>
        </div>

        {/* Qualité & Conformité */}
        <div className="space-y-4 p-4 bg-muted/30 rounded-xl border border-border">
          <Label className="font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4" /> {t("dashboard.requests.new.quality_compliance", "Qualité & Conformité")}
          </Label>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("dashboard.requests.new.quality_standard", "Standard qualité")}</Label>
              <Select value={formData.quality_standard} onValueChange={v => handleChange("quality_standard", v)} disabled={readOnly}>
                <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                <SelectContent>
                  {CERTIFICATIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t("dashboard.requests.new.labeling", "Exigences étiquetage")}</Label>
              <Textarea
                placeholder="Composition, Pays origine, Taille, Entretien, Marque, Lot..."
                value={formData.labeling_requirements}
                onChange={e => handleChange("labeling_requirements", e.target.value)}
                disabled={readOnly}
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* Emballage */}
        <div className="grid md:grid-cols-3 gap-4">
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
            <Label>{t("dashboard.requests.new.packing_per_carton", "Pièces par carton")}</Label>
            <Input type="number" placeholder="Ex: 50" value={formData.packing_per_carton} onChange={e => handleChange("packing_per_carton", e.target.value)} disabled={readOnly} />
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard.requests.new.unit", "Unité")}</Label>
            <Select value={formData.unit} onValueChange={v => handleChange("unit", v)} disabled={readOnly}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pcs">Pièces</SelectItem>
                <SelectItem value="sets">Sets</SelectItem>
                <SelectItem value="pairs">Paires</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Budget */}
        <div className="grid md:grid-cols-3 gap-4 pt-2 border-t border-border">
          <div className="space-y-2">
            <Label>{t("dashboard.requests.new.target_price", "Prix cible ($/pièce)")}</Label>
            <Input type="number" step="0.01" placeholder="Ex: 4.50" value={formData.target_price_usd} onChange={e => handleChange("target_price_usd", e.target.value)} disabled={readOnly} />
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard.requests.new.budget_min", "Budget min ($/pièce)")}</Label>
            <Input type="number" step="0.01" placeholder="Min" value={formData.budget_min_usd} onChange={e => handleChange("budget_min_usd", e.target.value)} disabled={readOnly} />
          </div>
          <div className="space-y-2">
            <Label>{t("dashboard.requests.new.budget_max", "Budget max ($/pièce)")}</Label>
            <Input type="number" step="0.01" placeholder="Max" value={formData.budget_max_usd} onChange={e => handleChange("budget_max_usd", e.target.value)} disabled={readOnly} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}