"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/lib/i18n-context"
import {
  Tag, Scale, Palette, Grid3x3, Shield, ChevronDown, ChevronUp
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

const TEXTILE_CATEGORIES = [
  "T-shirt / Top", "Pantalon / Bottom", "Robe / Jupe", "Veste / Manteau",
  "Sous-vêtements / Lingerie", "Chaussettes / Collants", "Maillot de bain",
  "Vêtements de sport", "Uniformes / Workwear", "Tissu au mètre",
  "Accessoires textile", "Autre"
]

const COMPOSITIONS = [
  "100% Coton", "100% Polyester", "100% Lin", "100% Soie", "100% Laine",
  "100% Viscose", "100% Tencel / Lyocell", "100% Modal",
  "65% Polyester / 35% Coton", "50% Coton / 50% Polyester",
  "95% Coton / 5% Élasthanne", "90% Polyester / 10% Élasthanne",
  "80% Coton / 20% Polyester", "Mélange laine / acrylique", "Autre"
]

const CERTIFICATIONS = [
  "Oeko-Tex Standard 100", "GOTS", "GRS", "Fair Trade", "BSCI",
  "SA8000", "ISO 9001", "REACH", "CPSIA", "Bluesign"
]

const SIZE_STANDARDS = [
  { value: "EU", label: "EU (34–56)" },
  { value: "US", label: "US (XS–3XL)" },
  { value: "UK", label: "UK (6–22)" },
  { value: "INT", label: "INT (XS–3XL)" },
  { value: "CM", label: "Tour poitrine (cm)" },
]

const SIZE_OPTIONS: Record<string, string[]> = {
  EU: ["34","36","38","40","42","44","46","48","50","52","54","56"],
  US: ["XS","S","M","L","XL","2XL","3XL"],
  UK: ["6","8","10","12","14","16","18","20","22"],
  INT: ["XS","S","M","L","XL","2XL","3XL"],
  CM: ["80","84","88","92","96","100","104","108","112"],
}

const PACKAGING_TYPES = [
  "Polybag individuel", "Polybag + carton", "Boîte cadeau",
  "Suspendu (cintre)", "Pli plat", "Roulé", "Sous vide", "Autre"
]

interface TextileSpecFormProps {
  initialData?: any
  onChange: (data: any) => void
  readOnly?: boolean
  lineNumber: number
}

export function TextileSpecForm({ initialData, onChange, readOnly, lineNumber }: TextileSpecFormProps) {
  const { t } = useLanguage()
  const [showOptional, setShowOptional] = useState(false)
  const [formData, setFormData] = useState({
    product_name: "",
    category: "",
    composition: "",
    weight_gsm: "",
    color_reference: "",
    size_standard: "INT",
    sizes: {} as Record<string, number>,
    total_quantity: "",
    unit: "pcs",
    target_price_usd: "",
    budget_min_usd: "",
    budget_max_usd: "",
    certifications: [] as string[],
    packaging_type: "",
    packing_per_carton: "",
    labeling_requirements: "",
    hs_code: "",
    ...initialData
  })
  const [sizeQty, setSizeQty] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initialData) {
      setFormData((prev: any) => ({ ...prev, ...initialData }))
      if (initialData.sizes) {
        const sq: Record<string, string> = {}
        Object.entries(initialData.sizes).forEach(([k, v]) => { sq[k] = String(v) })
        setSizeQty(sq)
      }
    }
  }, [initialData])

  const update = (field: string, value: any) => {
    const next = { ...formData, [field]: value }
    setFormData(next)
    onChange(next)
  }

  const handleSizeQty = (size: string, qty: string) => {
    const next = { ...sizeQty, [size]: qty }
    setSizeQty(next)
    const sizes: Record<string, number> = {}
    Object.entries(next).forEach(([k, v]) => { if (v && parseInt(v) > 0) sizes[k] = parseInt(v) })
    const total = Object.values(sizes).reduce((s, n) => s + n, 0)
    const nd = { ...formData, sizes, total_quantity: String(total) }
    setFormData(nd)
    onChange(nd)
  }

  const toggleCert = (cert: string) => {
    const certs: string[] = formData.certifications || []
    const next = certs.includes(cert) ? certs.filter((c: string) => c !== cert) : [...certs, cert]
    update("certifications", next)
  }

  const sizes = SIZE_OPTIONS[formData.size_standard] || []
  const totalQty = Object.values(sizeQty).reduce((s, v) => s + (parseInt(v) || 0), 0)

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">{lineNumber}</div>
          <div>
            <p className="font-semibold text-sm">{t("spec.textile.title", "Fiche Textile")}</p>
            <p className="text-xs text-muted-foreground">{t("spec.textile.subtitle", "Habillement & Tissus")}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">{t("spec.textile.badge", "TEXTILE")}</Badge>
      </div>

      <div className="p-6 space-y-6">
        {/* Section 1 — Identification */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.product_name", "Désignation commerciale")} *</Label>
            <Input
              placeholder={t("spec.textile.name_placeholder", "Ex. T-shirt col rond 180 g/m² – coton bio")}
              value={formData.product_name}
              onChange={e => update("product_name", e.target.value)}
              disabled={readOnly}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.textile.category", "Catégorie")} *</Label>
            <Select value={formData.category} onValueChange={v => update("category", v)} disabled={readOnly}>
              <SelectTrigger className="h-10"><SelectValue placeholder={t("spec.select", "Sélectionner...")} /></SelectTrigger>
              <SelectContent>{TEXTILE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.textile.composition", "Composition")} *</Label>
            <Select value={formData.composition} onValueChange={v => update("composition", v)} disabled={readOnly}>
              <SelectTrigger className="h-10"><SelectValue placeholder={t("spec.select", "Sélectionner...")} /></SelectTrigger>
              <SelectContent>{COMPOSITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="flex items-center gap-1.5"><Scale className="w-3 h-3" />{t("spec.textile.gsm", "Grammage (g/m²)")}</span>
            </Label>
            <Input type="number" placeholder="Ex. 180" value={formData.weight_gsm} onChange={e => update("weight_gsm", e.target.value)} disabled={readOnly} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="flex items-center gap-1.5"><Palette className="w-3 h-3" />{t("spec.textile.color", "Référence couleur (Pantone / RAL)")}</span>
            </Label>
            <Input placeholder="Ex. Pantone 19-4052 TCX" value={formData.color_reference} onChange={e => update("color_reference", e.target.value)} disabled={readOnly} className="h-10" />
          </div>
        </div>

        {/* Section 2 — Tailles & Quantités */}
        <div className="rounded-lg border border-border p-4 space-y-4">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Grid3x3 className="w-3 h-3" />{t("spec.textile.sizes", "Tailles & Quantités par taille")}
          </Label>
          <div className="flex flex-wrap gap-2">
            {SIZE_STANDARDS.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => { update("size_standard", s.value); setSizeQty({}) }}
                disabled={readOnly}
                className={`px-3 py-1 text-xs rounded-md border transition-colors ${formData.size_standard === s.value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}
              >{s.label}</button>
            ))}
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {sizes.map(size => (
              <div key={size} className="flex flex-col items-center gap-1 p-2 border border-border rounded-lg bg-muted/20">
                <span className="text-xs font-medium text-muted-foreground">{size}</span>
                <Input
                  type="number" min={0} placeholder="0"
                  value={sizeQty[size] || ""}
                  onChange={e => handleSizeQty(size, e.target.value)}
                  disabled={readOnly}
                  className="w-full text-center text-xs h-8 px-1"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <span className="text-sm text-muted-foreground">{t("spec.total_qty", "Quantité totale")}</span>
            <span className="font-bold text-primary">{totalQty} {formData.unit}</span>
          </div>
        </div>

        {/* Section 3 — Budget */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.target_price", "Prix cible ($/pièce)")} *</Label>
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
            {/* Certifications */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Shield className="w-3 h-3" />{t("spec.certifications", "Certifications requises")}
              </Label>
              <div className="flex flex-wrap gap-2">
                {CERTIFICATIONS.map(cert => (
                  <button
                    key={cert}
                    type="button"
                    onClick={() => toggleCert(cert)}
                    disabled={readOnly}
                    className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${(formData.certifications || []).includes(cert) ? "bg-primary/10 text-primary border-primary/30" : "border-border hover:border-primary/40"}`}
                  >{cert}</button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.packaging", "Emballage")}</Label>
                <Select value={formData.packaging_type} onValueChange={v => update("packaging_type", v)} disabled={readOnly}>
                  <SelectTrigger className="h-10"><SelectValue placeholder={t("spec.select", "Sélectionner...")} /></SelectTrigger>
                  <SelectContent>{PACKAGING_TYPES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.pieces_per_carton", "Pièces / carton")}</Label>
                <Input type="number" placeholder="Ex. 50" value={formData.packing_per_carton} onChange={e => update("packing_per_carton", e.target.value)} disabled={readOnly} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.hs_code", "Code SH (HS Code)")}</Label>
                <Input placeholder="Ex. 6109.10" value={formData.hs_code} onChange={e => update("hs_code", e.target.value)} disabled={readOnly} className="h-10 font-mono" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.textile.labeling", "Exigences d'étiquetage")}</Label>
              <Textarea
                placeholder={t("spec.textile.labeling_placeholder", "Composition, pays d'origine, taille, instructions d'entretien, marque...")}
                value={formData.labeling_requirements}
                onChange={e => update("labeling_requirements", e.target.value)}
                disabled={readOnly}
                rows={2}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}