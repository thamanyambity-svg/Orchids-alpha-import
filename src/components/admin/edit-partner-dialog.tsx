"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
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
import type { PartnerProfile, Profile, ContractStatus } from "@/lib/types"

/** Partenaire avec infos user, ou objet fusionné (id=user_id, full_name, etc.) */
export interface PartnerWithUser extends Omit<Partial<PartnerProfile>, 'contract_status'> {
    id: string
    user_id?: string
    user?: Profile
    full_name?: string
    company_name?: string
    city?: string
    status?: string
    contract_status?: ContractStatus | string
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
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

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
            // 1. Update Profile (Base Info)
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    company_name: formData.company_name, // Schema has company_name on profiles
                    city: formData.city,
                    status: formData.status
                })
                .eq('id', partner.id)

            if (profileError) throw profileError

            // 2. Update Partner Profile (Specifics)
            // Parse assigned cities
            const citiesArray = formData.assigned_cities
                .split(",")
                .map((c: string) => c.trim())
                .filter((c: string) => c.length > 0)

            // We need to check if partner_profile exists, it should.
            const { error: partnerError } = await supabase
                .from('partner_profiles')
                .update({
                    assigned_cities: citiesArray,
                    performance_score: Number(formData.performance_score),
                    contract_status: formData.contract_status
                })
                .eq('user_id', partner.id)

            if (partnerError) throw partnerError

            toast.success("Partenaire mis à jour avec succès")
            onUpdate()
            onClose()
        } catch (error: unknown) {
            console.error("Error updating partner:", error)
            toast.error("Erreur lors de la mise à jour: " + (error instanceof Error ? error.message : "Erreur inconnue"))
        } finally {
            setLoading(false)
        }
    }

    if (!partner) return null

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Modifier le Partenaire</DialogTitle>
                    <DialogDescription>
                        Mettez à jour les informations du profil et du contrat.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="full_name">Nom complet</Label>
                            <Input
                                id="full_name"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="company_name">Entreprise</Label>
                            <Input
                                id="company_name"
                                value={formData.company_name}
                                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                placeholder="Nom de la société"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="city">Ville (Siège)</Label>
                            <Input
                                id="city"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Statut KYC</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(val) => setFormData({ ...formData, status: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selectionner" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PENDING">PENDING (En attente)</SelectItem>
                                    <SelectItem value="VERIFIED">VERIFIED (Validé)</SelectItem>
                                    <SelectItem value="SUSPENDED">SUSPENDED (Suspendu)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="assigned_cities">Villes couvertes (séparées par des virgules)</Label>
                        <Input
                            id="assigned_cities"
                            value={formData.assigned_cities}
                            onChange={(e) => setFormData({ ...formData, assigned_cities: e.target.value })}
                            placeholder="Ex: Shanghai, Ningbo, Shenzhen"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="performance">Performance /5</Label>
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
                            <Label htmlFor="contract">Statut Contrat</Label>
                            <Select
                                value={formData.contract_status}
                                onValueChange={(val) => setFormData({ ...formData, contract_status: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selectionner" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PENDING">En Négociation</SelectItem>
                                    <SelectItem value="ACTIVE">Actif / Signé</SelectItem>
                                    <SelectItem value="TERMINATED">Terminé</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>Annuler</Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? "Sauvegarde..." : "Enregistrer"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
