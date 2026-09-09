"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/lib/i18n-context"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { ShieldAlert, AlertTriangle, TrendingUp, UserX, AlertOctagon, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

export default function AdminRisksPage() {
    const { t } = useLanguage()
    const [highRiskOrders, setHighRiskOrders] = useState<any[]>([])
    const [restrictedSuppliers, setRestrictedSuppliers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        fetchRiskData()
    }, [])

    async function fetchRiskData() {
        setLoading(true)
        try {
            // 1. High Value Orders (> 10,000)
            const { data: orders } = await supabase
                .from('orders')
                .select(`
            *,
            request:import_requests(buyer:profiles(*))
        `)
                .gt('total_amount', 10000) // Threshold for "High Risk" review
                .order('created_at', { ascending: false })

            // 2. Restricted Suppliers
            const { data: suppliers } = await supabase
                .from('suppliers')
                .select('*')
                .eq('status', 'RESTRICTED')

            setHighRiskOrders(orders || [])
            setRestrictedSuppliers(suppliers || [])

        } catch (error) {
            console.error("Error fetching risk data:", error)
            toast.error("Erreur de chargement des données de risque")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl">Gestion des Risques</h1>
                    <p className="text-muted-foreground">
                        Surveillance des opérations sensibles et de la conformité.
                    </p>
                </div>
            </div>

            {/* KPI Section */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-destructive-subtle border-destructive-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="t-label text-destructive">{t("admin.risks.high_value_orders", "Commandes à Haute Valeur")}</CardTitle>
                        <TrendingUp className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-display text-4xl leading-none text-destructive [font-variant-numeric:tabular-nums]">{highRiskOrders.length}</div>
                        <p className="text-xs text-destructive">Nécessitent une double validation</p>
                    </CardContent>
                </Card>

                <Card className="bg-warning-subtle border-warning-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="t-label text-warning">{t("admin.risks.restricted_suppliers", "Fournisseurs Restreints")}</CardTitle>
                        <AlertOctagon className="h-4 w-4 text-warning" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-display text-4xl leading-none text-warning [font-variant-numeric:tabular-nums]">{restrictedSuppliers.length}</div>
                        <p className="text-xs text-warning">Non conformes ou en probation</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="t-label text-muted-foreground">Score de Risque Global</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-success" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-display text-4xl leading-none text-success [font-variant-numeric:tabular-nums]">Faible</div>
                        <p className="text-xs text-muted-foreground">Basé sur les incidents actifs</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* High Value Orders Table */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-destructive" />
                            Transactions Sensibles (&gt; 10k€)
                        </CardTitle>
                        <CardDescription>
                            Ces commandes nécessitent une attention particulière.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ref</TableHead>
                                    <TableHead>Montant</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead className="text-end">{t("admin.risks.status", "Statut")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {highRiskOrders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">R.A.S</TableCell>
                                    </TableRow>
                                ) : (
                                    highRiskOrders.map(order => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-mono text-xs">{order.reference}</TableCell>
                                            <TableCell className="font-bold">${order.total_amount?.toLocaleString()}</TableCell>
                                            <TableCell className="text-xs">{order.request?.buyer?.full_name}</TableCell>
                                            <TableCell className="text-end">
                                                <Badge variant="outline">{order.status}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Compliance Alerts */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-warning" />
                            Alertes Conformité
                        </CardTitle>
                        <CardDescription>
                            Entités marquées comme inéligibles ou suspendues.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nom</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-end">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {restrictedSuppliers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">Aucune alerte active</TableCell>
                                    </TableRow>
                                ) : (
                                    restrictedSuppliers.map(supplier => (
                                        <TableRow key={supplier.id}>
                                            <TableCell className="font-medium">{supplier.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="destructive" className="text-[10px]">Fournisseur</Badge>
                                            </TableCell>
                                            <TableCell className="text-end">
                                                <Button variant="ghost" size="sm" className="h-6 text-xs">Revoir</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
