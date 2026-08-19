"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type PartnerFormValues = {
  email: string
  full_name: string
  company_name: string
  country_id: string
  whatsapp_number: string
  phone: string
  address_line: string
  city: string
  commission_rate: number
  application_id?: string
}

const EMPTY: PartnerFormValues = {
  email: "",
  full_name: "",
  company_name: "",
  country_id: "",
  whatsapp_number: "",
  phone: "",
  address_line: "",
  city: "",
  commission_rate: 10,
}

/**
 * Formulaire partagé par les deux chemins de création : depuis la liste des
 * partenaires, et depuis l'approbation d'une candidature (avec valeurs
 * pré-remplies). Il n'écrit jamais en base directement : tout passe par
 * POST /api/admin/partners, qui reste le point unique de vérité.
 */
export function PartnerForm({
  countries,
  initialValues,
  onCreated,
}: {
  countries: { id: string; name: string }[]
  initialValues?: Partial<PartnerFormValues>
  onCreated?: (partnerId: string) => void
}) {
  const [values, setValues] = useState<PartnerFormValues>({ ...EMPTY, ...initialValues })
  const [isSaving, setIsSaving] = useState(false)

  const set =
    (key: keyof PartnerFormValues) => (event: React.ChangeEvent<HTMLInputElement>) =>
      setValues((current) => ({ ...current, [key]: event.target.value }))

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSaving(true)
    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, commission_rate: Number(values.commission_rate) }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || "Création refusée")

      toast.success("Partenaire créé. Une invitation a été envoyée par email.")
      onCreated?.(payload.id)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="full_name">Nom du contact</Label>
          <Input id="full_name" value={values.full_name} onChange={set("full_name")} required />
        </div>
        <div>
          <Label htmlFor="company_name">Société</Label>
          <Input
            id="company_name"
            value={values.company_name}
            onChange={set("company_name")}
            required
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={values.email} onChange={set("email")} required />
        </div>
        <div>
          <Label htmlFor="whatsapp_number">WhatsApp (indicatif international obligatoire)</Label>
          <Input
            id="whatsapp_number"
            placeholder="+8613812345678"
            value={values.whatsapp_number}
            onChange={set("whatsapp_number")}
            required
          />
        </div>
        <div>
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" value={values.phone} onChange={set("phone")} />
        </div>
        <div>
          <Label htmlFor="city">Ville</Label>
          <Input id="city" value={values.city} onChange={set("city")} />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="address_line">Adresse</Label>
          <Input id="address_line" value={values.address_line} onChange={set("address_line")} />
        </div>
        <div>
          <Label htmlFor="country_id">Pays</Label>
          <select
            id="country_id"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={values.country_id}
            onChange={(e) => setValues((c) => ({ ...c, country_id: e.target.value }))}
            required
          >
            <option value="">Sélectionner…</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="commission_rate">Commission (%)</Label>
          <Input
            id="commission_rate"
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={values.commission_rate}
            onChange={set("commission_rate")}
          />
        </div>
      </div>

      <Button type="submit" disabled={isSaving}>
        {isSaving ? "Création…" : "Créer le partenaire et envoyer l'invitation"}
      </Button>
    </form>
  )
}
