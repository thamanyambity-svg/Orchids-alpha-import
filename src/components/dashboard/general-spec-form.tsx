"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/lib/i18n-context"
import { ChevronDown, ChevronUp, Shield, Plus, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const PACKAGING_TYPES = [
  "Carton standard", "Carton renforcé", "Caisse bois", "Palettisé",
  "Big Bag", "Sac papier", "Sac plastique", "Fût métal",
  "Fût plastique", "IBC (vrac)", "Vrac", "Autre"
]

const COMMON_CERTIFICATIONS = [
  "CE", "FDA", "RoHS", "REACH", "ISO 9001", "ISO 14001",
  "UL", "FCC", "CCC", "GS", "TÜV", "EAC", "HACCP", "Autre"
]

interface GeneralSpecFormProps {
  initialData?: any
  onChange: (data: any) => void
  readOnly?: boolean
  lineNumber: number
  categoryLabel?: string
}

export function GeneralSpecForm({ initialData, onChange, readOnly, lineNumber, categoryLabel }: GeneralSpecFormProps) {
  const { t } = useLanguage()
  const [showOptional, setShowOptional] = useState(false)
  const [specsEntries, setSpecsEntries] = useState<Array<{key: string; value: string}>>([])
  const [formData, setFormData] = useState({
    product_name: "",
    description: "",
    hs_code: "",
    packaging_type: "",
    units_per_carton: "",
    quantity: "",
    unit: "units",
    target_price_usd: "",
    budget_min_usd: "",
    budget_max_usd: "",
    certifications: [] as string[],
    specifications_json: {} as Record<string, string>,
    notes: "",
    ...initialData
  })

  useEffect(() => {
    if (initialData) {
      setFormData((prev: any) => ({ ...prev, ...initialData }))
      if (initialData.specifications_json) {
        setSpecsEntries(Object.entries(initialData.specifications_json).map(([k, v]) => ({ key: k, value: String(v) })))
      }
    }
  }, [initialData])

  const update = (field: string, value: any) => {
    const next = { ...formData, [field]: value }
    setFormData(next)
    onChange(next)
  }

  const toggleCert = (cert: string) => {
    const certs: string[] = formData.certifications || []
    const next = certs.includes(cert) ? certs.filter((c: string) => c !== cert) : [...certs, cert]
    update("certifications", next)
  }

  const addSpec = () => setSpecsEntries([...specsEntries, { key: "", value: "" }])

  const updateSpec = (i: number, field: "key" | "value", val: string) => {
    const newEntries = [...specsEntries]
    newEntries[i] = { ...newEntries[i], [field]: val }
    setSpecsEntries(newEntries)
    const specs: Record<string, string> = {}
    newEntries.forEach(e => { if (e.key) specs[e.key] = e.value })
    update("specifications_json", specs)
  }

  const removeSpec = (i: number) => {
    const newEntries = specsEntries.filter((_, idx) => idx !== i)
    setSpecsEntries(newEntries)
    const specs: Record<string, string> = {}
    newEntries.forEach(e => { if (e.key) specs[e.key] = e.value })
    update("specifications_json", specs)
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">{lineNumber}</div>
          <div>
            <p className="font-semibold text-sm">{t("spec.general.title", "Fiche Produit")}</p>
            <p className="text-xs text-muted-foreground">{categoryLabel || t("spec.general.subtitle", "Produit général")}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">{categoryLabel?.toUpperCase() || t("spec.general.badge", "GÉNÉRAL")}</Badge>
      </div>

      <div className="p-6 space-y-6">
        {/* Identification */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.product_name", "Désignation commerciale")} *</Label>
            <Input
              placeholder={t("spec.general.name_placeholder", "Ex. Pompe centrifuge 50 m³/h – acier inox 316L")}
              value={formData.product_name}
              onChange={e => update("product_name", e.target.value)}
              disabled={readOnly}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.description", "Description & spécifications")}</Label>
            <Textarea
              placeholder={t("spec.general.desc_placeholder", "Caractéristiques techniques, usage prévu, matériaux, normes applicables...")}
              value={formData.description}
              onChange={e => update("description", e.target.value)}
              disabled={readOnly}
              rows={3}
            />
          </div>
        </div>

        {/* Spécifications libres (clé/valeur) */}
        <div className="rounded-lg border border-border p-4 space-y-3">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.tech_specs", "Spécifications techniques")}</Label>
          {specsEntries.length === 0 && (
            <p className="text-xs text-muted-foreground">{t("spec.tech_specs_hint", "Ajoutez vos spécifications techniques sous forme de paires clé / valeur.")}</p>
          )}
          {specsEntries.map((entry, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder={t("spec.key_placeholder", "Paramètre (ex. Tension, Débit, Puissance)")}
                value={entry.key}
                onChange={e => updateSpec(i, "key", e.target.value)}
                disabled={readOnly}
                className="flex-1 h-9 text-sm"
              />
              <Input
                placeholder={t("spec.value_placeholder", "Valeur (ex. 220 V, 50 m³/h, 1500 W)")}
                value={entry.value}
                onChange={e => updateSpec(i, "value", e.target.value)}
                disabled={readOnly}
                className="flex-1 h-9 text-sm"
              />
              <Button variant="ghost" size="icon" onClick={() => removeSpec(i)} disabled={readOnly} className="h-9 w-9 text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addSpec} disabled={readOnly} className="text-xs h-8 gap-1.5">
            <Plus className="w-3 h-3" />{t("spec.add_spec", "Ajouter une spécification")}
          </Button>
        </div>

        {/* Quantité & Budget */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.quantity", "Quantité")} *</Label>
            <Input type="number" min={1} placeholder="1" value={formData.quantity} onChange={e => update("quantity", e.target.value)} disabled={readOnly} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.unit", "Unité")} *</Label>
            <Select value={formData.unit} onValueChange={v => update("unit", v)} disabled={readOnly}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="units">{t("unit.units", "Unités")}</SelectItem>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="tons">{t("unit.tons", "Tonnes")}</SelectItem>
                <SelectItem value="cartons">{t("unit.cartons", "Cartons")}</SelectItem>
                <SelectItem value="pallets">{t("unit.pallets", "Palettes")}</SelectItem>
                <SelectItem value="m2">m²</SelectItem>
                <SelectItem value="m3">m³</SelectItem>
                <SelectItem value="liters">{t("unit.liters", "Litres")}</SelectItem>
              </SelectContent>
            </Select>
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

        {/* Optionnel */}
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
                {COMMON_CERTIFICATIONS.map(cert => (
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
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.hs_code", "Code SH / HS Code (6–10 chiffres)")}</Label>
                <Input placeholder="Ex. 8517.12.00" value={formData.hs_code} onChange={e => update("hs_code", e.target.value)} disabled={readOnly} className="h-10 font-mono" />
                <p className="text-xs text-muted-foreground">{t("spec.hs_code_hint", "Code harmonisé du Système Harmonisé (SH) – 6 premiers chiffres universels")}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.packaging", "Type d'emballage")}</Label>
                <Select value={formData.packaging_type} onValueChange={v => update("packaging_type", v)} disabled={readOnly}>
                  <SelectTrigger className="h-10"><SelectValue placeholder={t("spec.select", "Sélectionner...")} /></SelectTrigger>
                  <SelectContent>{PACKAGING_TYPES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("spec.notes", "Remarques & instructions particulières")}</Label>
              <Textarea
                placeholder={t("spec.notes_placeholder", "Exigences spécifiques, contraintes logistiques, instructions d'emballage...")}
                value={formData.notes}
                onChange={e => update("notes", e.target.value)}
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