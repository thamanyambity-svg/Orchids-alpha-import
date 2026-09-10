"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/i18n-context"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import type { PartnerProfile, Profile } from "@/lib/types"

/** Partenaire avec infos user, ou objet fusionné (id=user_id, full_name, etc.) */
export interface PartnerWithUser extends Partial<Omit<PartnerProfile, 'contract_status'>> {
    id: string
    user_id?: string
    /** Identifiant de la fiche `partner_profiles`, attendu par la route. */
    partner_profile_id?: string
    user?: Profile
    full_name?: string
    company_name?: string
    city?: string
    status?: string
    contract_status?: string
    performance_score?: number
    assigned_cities?: string[]
}

interface EditPartnerDialogProps {
    open: boolean
    onClose: () => void
    partner: PartnerWithUser
    onUpdate: () => void
}

export function EditPartnerDialog({ open, onClose, partner, onUpdate }: EditPartnerDialogProps) {
    const { t } = useLanguage()
    const [loading, setLoading] = useState(false)

    // Initialize state from partner prop when it opens/changes
    // (We use a key on the Dialog in parent to reset state, or effects)
    // For simplicity, we trust the parent to mount/unmount or we use defaultValues if simple.
    // Actually, better to use defaultValue in Uncontrolled inputs or state initialized in useEffect.
    // Let's use controlled state for robustness.
    const [formData, setFormData] = useState({
        full_name: partner?.full_name || "",
        company_name: partner?.company_name || "", // Need to ensure parent passes this
        city: partner?.city || "",
        assigned_cities: partner?.assigned_cities ? partner.assigned_cities.join(", ") : "",
        performance_score: partner?.performance_score || 0,
        status: partner?.status || "PENDING",
        contract_status: partner?.contract_status || "PENDING",
        // We treat country as read-only or tricky to edit without a list, let's skip for now or keep generic
    })

    async function handleSave() {
        setLoading(true)
        try {
            // Écriture par la route serveur. Depuis le navigateur, la mise à
            // jour du profil touchait zéro ligne — l'administrateur n'a aucun
            // droit de modification sur le compte d'un autre — et la fenêtre
            // annonçait pourtant un succès.
            if (!partner.partner_profile_id) {
                throw new Error(t("admin.edit_partner.no_record", "Fiche partenaire introuvable"))
            }

            const citiesArray = formData.assigned_cities
                .split(",")
                .map((c: string) => c.trim())
                .filter((c: string) => c.length > 0)

            const res = await fetch(`/api/admin/partners/${partner.partner_profile_id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    full_name: formData.full_name,
                    company_name: formData.company_name,
                    city: formData.city,
                    status: formData.status,
                    assigned_cities: citiesArray,
                    performance_score: Number(formData.performance_score),
                    contract_status: formData.contract_status,
                }),
            })

            if (!res.ok) {
                const corps = await res.json().catch(() => ({}))
                throw new Error(corps.error || `Erreur ${res.status}`)
            }

            toast.success(t("admin.edit_partner.update_success", "Partenaire mis à jour avec succès"))
            onUpdate()
            onClose()
        } catch (error: unknown) {
            console.error("Error updating partner:", error)
            toast.error(t("admin.edit_partner.update_error", "Erreur lors de la mise à jour") + ": " + (error instanceof Error ? error.message : t("admin.edit_partner.unknown_error", "Erreur inconnue")))
        } finally {
            setLoading(false)
        }
    }

    if (!partner) return null

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t("admin.edit_partner.title", "Modifier le Partenaire")}</DialogTitle>
                    <DialogDescription>
                        {t("admin.edit_partner.description", "Mettez à jour les informations du profil et du contrat.")}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="full_name">{t("admin.edit_partner.full_name", "Nom complet")}</Label>
                            <Input
                                id="full_name"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="company_name">{t("admin.edit_partner.company_name", "Entreprise")}</Label>
                            <Input
                                id="company_name"
                                value={formData.company_name}
                                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                placeholder={t("admin.edit_partner.company_placeholder", "Nom de la société")}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="city">{t("admin.edit_partner.city", "Ville (Siège)")}</Label>
                            <Input
                                id="city"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">{t("admin.edit_partner.kyc_status", "Statut KYC")}</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(val) => setFormData({ ...formData, status: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t("admin.edit_partner.select_placeholder", "Selectionner")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PENDING">{t("admin.edit_partner.pending", "PENDING (En attente)")}</SelectItem>
                                    <SelectItem value="VERIFIED">{t("admin.edit_partner.verified", "VERIFIED (Validé)")}</SelectItem>
                                    <SelectItem value="SUSPENDED">{t("admin.edit_partner.suspended", "SUSPENDED (Suspendu)")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="assigned_cities">{t("admin.edit_partner.assigned_cities", "Villes couvertes (séparées par des virgules)")}</Label>
                        <Input
                            id="assigned_cities"
                            value={formData.assigned_cities}
                            onChange={(e) => setFormData({ ...formData, assigned_cities: e.target.value })}
                            placeholder={t("admin.edit_partner.cities_placeholder", "Ex: Shanghai, Ningbo, Shenzhen")}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="performance">{t("admin.edit_partner.performance", "Performance /5")}</Label>
                            <Input
                                id="performance"
                                type="number"
                                min="0"
                                max="5"
                                step="0.1"
                                value={formData.performance_score}
                                onChange={(e) => setFormData({ ...formData, performance_score: Number(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contract">{t("admin.edit_partner.contract_status", "Statut Contrat")}</Label>
                            <Select
                                value={formData.contract_status}
                                onValueChange={(val) => setFormData({ ...formData, contract_status: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t("admin.edit_partner.select_placeholder", "Selectionner")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PENDING">{t("admin.edit_partner.negotiating", "En Négociation")}</SelectItem>
                                    <SelectItem value="ACTIVE">{t("admin.edit_partner.active", "Actif / Signé")}</SelectItem>
                                    <SelectItem value="TERMINATED">{t("admin.edit_partner.terminated", "Terminé")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>{t("admin.edit_partner.cancel", "Annuler")}</Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? t("admin.edit_partner.saving", "Sauvegarde...") : t("admin.edit_partner.save", "Enregistrer")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
