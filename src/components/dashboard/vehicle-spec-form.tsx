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

/**
 * Modèles courants par marque, proposés dès que la marque est choisie.
 *
 * Retenus pour ce qui s'importe réellement vers l'Afrique centrale : pick-up,
 * 4x4, utilitaires, berlines robustes. « Autre modèle » reste disponible —
 * la liste guide la saisie, elle ne la limite pas.
 */
const MODELES: Record<string, string[]> = {
  "Toyota": ["Hilux", "Land Cruiser", "Land Cruiser Prado", "Land Cruiser 70", "Fortuner", "RAV4", "Corolla", "Camry", "Yaris", "Hiace", "Coaster", "Rush", "Highlander", "Tundra", "Dyna"],
  "Mercedes-Benz": ["Classe G", "Classe C", "Classe E", "Classe S", "GLE", "GLC", "GLS", "Sprinter", "Vito", "Actros", "Atego"],
  "BMW": ["Série 3", "Série 5", "Série 7", "X1", "X3", "X5", "X6", "X7"],
  "Hyundai": ["Tucson", "Santa Fe", "Creta", "Elantra", "Accent", "i10", "H-1", "H100", "Palisade"],
  "Nissan": ["Navara", "Patrol", "X-Trail", "Qashqai", "Hardbody", "Urvan", "Sunny", "Pathfinder", "Almera"],
  "Mitsubishi": ["L200", "Pajero", "Pajero Sport", "Outlander", "ASX", "Canter", "Fuso"],
  "Ford": ["Ranger", "Everest", "F-150", "Explorer", "Transit", "Escape", "Territory"],
  "Lexus": ["LX", "GX", "RX", "NX", "ES", "LS"],
  "Volkswagen": ["Amarok", "Touareg", "Tiguan", "Golf", "Polo", "Passat", "Crafter", "Transporter"],
  "Land Rover": ["Defender", "Range Rover", "Range Rover Sport", "Range Rover Evoque", "Discovery", "Discovery Sport"],
  "Peugeot": ["3008", "5008", "2008", "508", "Partner", "Boxer", "Landtrek"],
  "Renault": ["Duster", "Koleos", "Kwid", "Logan", "Master", "Kangoo", "Alaskan"],
  "Citroën": ["C3", "C5 Aircross", "Berlingo", "Jumper", "Jumpy"],
  "Kia": ["Sportage", "Sorento", "Seltos", "Picanto", "Rio", "K2700", "Carnival"],
  "Mazda": ["BT-50", "CX-5", "CX-9", "Mazda3", "Mazda6"],
  "Honda": ["CR-V", "HR-V", "Pilot", "Civic", "Accord", "Fit"],
  "Suzuki": ["Jimny", "Vitara", "Grand Vitara", "Swift", "Ertiga", "Carry", "Super Carry"],
  "Isuzu": ["D-Max", "MU-X", "NPR", "NQR", "FVR"],
  "Volvo": ["XC90", "XC60", "XC40", "FH", "FMX"],
  "Audi": ["Q7", "Q5", "Q3", "A4", "A6", "A8"],
  "Porsche": ["Cayenne", "Macan", "Panamera", "911"],
  "Jeep": ["Wrangler", "Grand Cherokee", "Cherokee", "Compass", "Gladiator"],
  "Chevrolet": ["Silverado", "Tahoe", "Colorado", "Captiva", "Trailblazer"],
}

const AUTRE_MODELE = "__autre__"

/**
 * Réglementation RDC sur l'âge des véhicules importés.
 *
 * Décret de 2026 (Première ministre) : 15 ans au plus depuis la première mise
 * en circulation pour les véhicules particuliers, utilitaires, poids lourds et
 * véhicules spécialisés ; 20 ans pour les tracteurs agricoles, forestiers et
 * miniers. Il remplace le régime de 2017, qui plafonnait à 20 ans, lui-même
 * successeur de la limite de 10 ans fixée en 2012 — ce qui explique qu'on
 * entende encore parler de 10 ans.
 */
const AGE_MAX_RDC = 15

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

  const modelesProposes = MODELES[formData.brand] ?? []
  // Modèle saisi hors liste (demande reprise, ou « Autre modèle ») : on garde
  // la saisie libre au lieu d'afficher une liste où il n'apparaît pas.
  const [modeleLibre, setModeleLibre] = useState(
    () => Boolean(initialData?.model) && !(MODELES[initialData?.brand] ?? []).includes(initialData?.model)
  )

  // Âge selon la règle : depuis la première mise en circulation si elle est
  // connue, sinon depuis l'année modèle, qui en est la meilleure approximation.
  const anneeReference = formData.first_registration_date
    ? new Date(formData.first_registration_date).getFullYear()
    : parseInt(formData.year, 10)
  const ageVehicule = Number.isFinite(anneeReference) && anneeReference > 1900
    ? new Date().getFullYear() - anneeReference
    : null

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
          <Label className="text-xs font-semibold uppercase font-condensed tracking-wide text-muted-foreground">{t("spec.vehicle.type", "Type de commande")} *</Label>
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
            <Label className="text-xs font-semibold uppercase font-condensed tracking-wide text-muted-foreground">{t("spec.vehicle.brand", "Marque")} *</Label>
            <Select
              value={formData.brand}
              onValueChange={v => {
                const next = { ...formData, brand: v, model: "" }
                setFormData(next)
                onChange(next)
                setModeleLibre(false)
              }}
              disabled={readOnly}
            >
              <SelectTrigger className="h-10"><SelectValue placeholder={t("spec.select", "Sélectionner...")} /></SelectTrigger>
              <SelectContent>{BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase font-condensed tracking-wide text-muted-foreground">{t("spec.vehicle.model", "Modèle")} *</Label>
            {modelesProposes.length > 0 && !modeleLibre ? (
              <Select
                value={formData.model || undefined}
                onValueChange={v => {
                  if (v === AUTRE_MODELE) {
                    setModeleLibre(true)
                    update("model", "")
                  } else {
                    update("model", v)
                  }
                }}
                disabled={readOnly}
              >
                <SelectTrigger className="h-10"><SelectValue placeholder={t("spec.select", "Sélectionner...")} /></SelectTrigger>
                <SelectContent>
                  {modelesProposes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  <SelectItem value={AUTRE_MODELE}>{t("spec.vehicle.other_model", "Autre modèle…")}</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder={formData.brand ? t("spec.vehicle.model_free", "Saisissez le modèle") : t("spec.vehicle.model_brand_first", "Choisissez d'abord la marque")}
                value={formData.model}
                onChange={e => update("model", e.target.value)}
                disabled={readOnly || !formData.brand}
                className="h-10"
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase font-condensed tracking-wide text-muted-foreground">{t("spec.vehicle.year", "Année modèle")} *</Label>
            <Input type="number" min={1990} max={new Date().getFullYear() + 1} placeholder="Ex. 2023" value={formData.year} onChange={e => update("year", e.target.value)} disabled={readOnly} className="h-10" />
          </div>
        </div>

        {formData.vehicle_type !== "PIECES_DETACHEES" && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${
              ageVehicule !== null && ageVehicule > AGE_MAX_RDC
                ? "border-destructive-border bg-destructive-subtle text-destructive"
                : ageVehicule !== null && ageVehicule >= AGE_MAX_RDC - 1
                  ? "border-warning-border bg-warning-subtle text-warning"
                  : "border-border bg-muted/30 text-muted-foreground"
            }`}
          >
            {ageVehicule !== null && ageVehicule > AGE_MAX_RDC ? (
              <p>
                <strong>{t("spec.vehicle.age_refused_title", "Importation refusée en RDC.")}</strong>{" "}
                {t("spec.vehicle.age_refused", `Ce véhicule a ${ageVehicule} ans. La réglementation congolaise interdit l'importation des véhicules de plus de ${AGE_MAX_RDC} ans depuis leur première mise en circulation : il serait bloqué à la douane.`)}
              </p>
            ) : ageVehicule !== null && ageVehicule >= AGE_MAX_RDC - 1 ? (
              <p>
                <strong>{t("spec.vehicle.age_limit_title", "Proche de la limite d'âge.")}</strong>{" "}
                {t("spec.vehicle.age_limit", `Ce véhicule a ${ageVehicule} ans, pour une limite de ${AGE_MAX_RDC} ans. Tenez compte du délai d'acheminement et faites confirmer la date de première mise en circulation par votre partenaire.`)}
              </p>
            ) : (
              <p>
                <strong>{t("spec.vehicle.age_rule_title", "Réglementation RDC :")}</strong>{" "}
                {t("spec.vehicle.age_rule", `un véhicule ne peut être importé s'il a plus de ${AGE_MAX_RDC} ans depuis sa première mise en circulation (20 ans pour les tracteurs agricoles, forestiers et miniers). Contrôle technique du pays d'origine, carte grise et acte de cession légalisé sont exigés.`)}
              </p>
            )}
          </div>
        )}

        {/* Spécifications techniques */}
        <div className="rounded-lg border border-border p-4 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase font-condensed tracking-wide text-muted-foreground">{t("spec.vehicle.engine", "Motorisation")}</Label>
            <Select value={formData.engine_type} onValueChange={v => update("engine_type", v)} disabled={readOnly}>
              <SelectTrigger className="h-10"><SelectValue placeholder={t("spec.select", "Sélectionner...")} /></SelectTrigger>
              <SelectContent>{ENGINE_TYPES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase font-condensed tracking-wide text-muted-foreground">{t("spec.vehicle.displacement", "Cylindrée (cc)")}</Label>
            <Input type="number" placeholder="Ex. 2755" value={formData.engine_displacement_cc} onChange={e => update("engine_displacement_cc", e.target.value)} disabled={readOnly} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase font-condensed tracking-wide text-muted-foreground">{t("spec.vehicle.transmission", "Boîte de vitesses")}</Label>
            <Select value={formData.transmission} onValueChange={v => update("transmission", v)} disabled={readOnly}>
              <SelectTrigger className="h-10"><SelectValue placeholder={t("spec.select", "Sélectionner...")} /></SelectTrigger>
              <SelectContent>{TRANSMISSIONS.map(tx => <SelectItem key={tx} value={tx}>{tx}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase font-condensed tracking-wide text-muted-foreground">{t("spec.vehicle.drivetrain", "Transmission")}</Label>
            <Select value={formData.drivetrain} onValueChange={v => update("drivetrain", v)} disabled={readOnly}>
              <SelectTrigger className="h-10"><SelectValue placeholder={t("spec.select", "Sélectionner...")} /></SelectTrigger>
              <SelectContent>{DRIVETRAINS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {/* État & historique (si occasion) */}
        {formData.vehicle_type !== "NEUF" && (
          <div className="rounded-lg border border-warning/20 bg-warning/5 p-4 grid md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase font-condensed tracking-wide text-muted-foreground">{t("spec.vehicle.condition", "État général")} *</Label>
              <Select value={formData.condition} onValueChange={v => update("condition", v)} disabled={readOnly}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>{CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase font-condensed tracking-wide text-muted-foreground">{t("spec.vehicle.mileage", "Kilométrage (km)")} *</Label>
              <Input type="number" min={0} placeholder="Ex. 85 000" value={formData.mileage_km} onChange={e => update("mileage_km", e.target.value)} disabled={readOnly} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase font-condensed tracking-wide text-muted-foreground">{t("spec.vehicle.first_reg", "1ère mise en circulation")}</Label>
              <Input type="date" value={formData.first_registration_date} onChange={e => update("first_registration_date", e.target.value)} disabled={readOnly} className="h-10" />
            </div>
          </div>
        )}

        {/* Budget */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase font-condensed tracking-wide text-muted-foreground">{t("spec.target_price", "Prix cible ($)")} *</Label>
            <Input type="number" step="0.01" placeholder="0.00" value={formData.target_price_usd} onChange={e => update("target_price_usd", e.target.value)} disabled={readOnly} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase font-condensed tracking-wide text-muted-foreground">{t("spec.budget_min", "Budget min ($)")} *</Label>
            <Input type="number" step="0.01" placeholder="0.00" value={formData.budget_min_usd} onChange={e => update("budget_min_usd", e.target.value)} disabled={readOnly} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase font-condensed tracking-wide text-muted-foreground">{t("spec.budget_max", "Budget max ($)")} *</Label>
            <Input type="number" step="0.01" placeholder="0.00" value={formData.budget_max_usd} onChange={e => update("budget_max_usd", e.target.value)} disabled={readOnly} className="h-10" />
          </div>
        </div>

        {/* Section optionnelle */}
        <button
          type="button"
          onClick={() => setShowOptional(!showOptional)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors w-full justify-between py-2 border-t border-border/50"
        >
          <span className="font-medium uppercase font-condensed tracking-wide">{t("spec.optional", "Informations complémentaires (optionnel)")}</span>
          {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showOptional && (
          <div className="space-y-4 pt-2">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase font-condensed tracking-wide text-muted-foreground">{t("spec.vehicle.color_ext", "Couleur extérieure")}</Label>
                <Input placeholder="Ex. Noir, Blanc perle" value={formData.color_exterior} onChange={e => update("color_exterior", e.target.value)} disabled={readOnly} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase font-condensed tracking-wide text-muted-foreground">{t("spec.vehicle.color_int", "Couleur intérieure")}</Label>
                <Input placeholder="Ex. Noir cuir" value={formData.color_interior} onChange={e => update("color_interior", e.target.value)} disabled={readOnly} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase font-condensed tracking-wide text-muted-foreground">{t("spec.vehicle.country_origin", "Pays d'origine")}</Label>
                <Input placeholder="Ex. Allemagne, Japon" value={formData.country_origin} onChange={e => update("country_origin", e.target.value)} disabled={readOnly} className="h-10" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase font-condensed tracking-wide text-muted-foreground">{t("spec.vehicle.equipment", "Équipements & Options souhaités")}</Label>
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
              <Label className="text-xs font-semibold uppercase font-condensed tracking-wide text-muted-foreground flex items-center gap-1.5">
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