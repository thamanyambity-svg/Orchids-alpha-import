"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  Search, 
  Plus, 
  Building2, 
  Mail, 
  Phone, 
  Star,
  MoreVertical,
  AlertCircle,
  CheckCircle2,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DashboardHeader } from "@/components/dashboard/header"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function PartnerSuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    capacity: ""
  })
  const supabase = createClient()

  useEffect(() => {
    fetchSuppliers()
  }, [])

  async function fetchSuppliers() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: partner } = await supabase
        .from('partner_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!partner) return

      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('partner_id', partner.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSuppliers(data || [])
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      toast.error("Erreur lors de la récupération des fournisseurs")
    } finally {
      setLoading(false)
    }
  }

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAdding(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: partner } = await supabase
        .from('partner_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!partner) return

      const { error } = await supabase
        .from('suppliers')
        .insert([{
          ...newSupplier,
          partner_id: partner.id,
          status: 'PENDING'
        }])

      if (error) throw error

      toast.success("Fournisseur ajouté avec succès")
      setNewSupplier({ name: "", contact_email: "", contact_phone: "", address: "", capacity: "" })
      fetchSuppliers()
    } catch (error) {
      console.error('Error adding supplier:', error)
      toast.error("Erreur lors de l'ajout du fournisseur")
    } finally {
      setIsAdding(false)
    }
  }

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.contact_email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div>
      <DashboardHeader 
        title="Mes Fournisseurs" 
        subtitle="Gérez votre base de données fournisseurs locaux"
      >
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nouveau fournisseur
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Ajouter un fournisseur</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSupplier} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de l'entreprise</Label>
                <Input 
                  id="name" 
                  placeholder="Ex: Shenzhen Tech Ltd" 
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email contact</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="contact@company.com" 
                    value={newSupplier.contact_email}
                    onChange={(e) => setNewSupplier({...newSupplier, contact_email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input 
                    id="phone" 
                    placeholder="+86..." 
                    value={newSupplier.contact_phone}
                    onChange={(e) => setNewSupplier({...newSupplier, contact_phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacité / Spécialisation</Label>
                <Input 
                  id="capacity" 
                  placeholder="Ex: Électronique grand public, min. 500 unités" 
                  value={newSupplier.capacity}
                  onChange={(e) => setNewSupplier({...newSupplier, capacity: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adresse physique</Label>
                <Input 
                  id="address" 
                  placeholder="Adresse complète" 
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({...newSupplier, address: e.target.value})}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isAdding}>
                {isAdding ? "Ajout en cours..." : "Enregistrer le fournisseur"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </DashboardHeader>

      <div className="p-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher un fournisseur..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filteredSuppliers.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.map((supplier, index) => (
              <motion.div
                key={supplier.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="group p-5 rounded-xl bg-card border border-border hover:border-primary/30 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    {supplier.validated_by_admin ? (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        <CheckCircle2 className="w-3 h-3" />
                        Validé Alpha
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full uppercase tracking-wider">
                        En attente
                      </div>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Modifier</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Désactiver</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <h3 className="font-semibold text-lg mb-1">{supplier.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-1">
                  {supplier.capacity || "Aucune spécialisation définie"}
                </p>

                <div className="space-y-2 border-t border-border pt-4">
                  {supplier.contact_email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      {supplier.contact_email}
                    </div>
                  )}
                  {supplier.contact_phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      {supplier.contact_phone}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-primary font-medium mt-2">
                    <Star className="w-4 h-4 fill-primary" />
                    {supplier.rating || "Nouveau"}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Aucun fournisseur</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-6">
              Vous n'avez pas encore ajouté de fournisseurs à votre catalogue local.
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Ajouter mon premier fournisseur</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Ajouter un fournisseur</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddSupplier} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom de l'entreprise</Label>
                    <Input 
                      id="name" 
                      placeholder="Ex: Shenzhen Tech Ltd" 
                      value={newSupplier.name}
                      onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email contact</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="contact@company.com" 
                        value={newSupplier.contact_email}
                        onChange={(e) => setNewSupplier({...newSupplier, contact_email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input 
                        id="phone" 
                        placeholder="+86..." 
                        value={newSupplier.contact_phone}
                        onChange={(e) => setNewSupplier({...newSupplier, contact_phone: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacité / Spécialisation</Label>
                    <Input 
                      id="capacity" 
                      placeholder="Ex: Électronique grand public, min. 500 unités" 
                      value={newSupplier.capacity}
                      onChange={(e) => setNewSupplier({...newSupplier, capacity: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Adresse physique</Label>
                    <Input 
                      id="address" 
                      placeholder="Adresse complète" 
                      value={newSupplier.address}
                      onChange={(e) => setNewSupplier({...newSupplier, address: e.target.value})}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isAdding}>
                    {isAdding ? "Ajout en cours..." : "Enregistrer le fournisseur"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  )
}
