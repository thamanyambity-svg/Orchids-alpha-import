"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { AlertTriangle, MessageSquare, CheckCircle2, Clock, Search, ExternalLink } from "lucide-react"

export default function AdminSupportPage() {
    const [incidents, setIncidents] = useState<any[]>([])
    const [messages, setMessages] = useState<any[]>([])
    const [avgResponseHours, setAvgResponseHours] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        fetchSupportData()
    }, [])

    async function fetchSupportData() {
        setLoading(true)
        try {
            // 1. Fetch Incidents
            const { data: incidentsData } = await supabase
                .from('incidents')
                .select(`
            *,
            order:orders(reference,
                request:import_requests(buyer:profiles(email, full_name))
            )
        `)
                .order('created_at', { ascending: false })

            // 2. Fetch Messages
            const { data: messagesData } = await supabase
                .from('messages')
                .select(`
            *,
            sender:profiles(email, full_name)
        `)
                .order('created_at', { ascending: false })
                .limit(20)

            // 3. Calcul du temps de réponse moyen (incidents résolus sur 7 jours)
            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
            const resolved = (incidentsData || []).filter(
                (i) => i.status === 'RESOLVED' && i.resolved_at && new Date(i.resolved_at) >= sevenDaysAgo
            )
            let avgH: number | null = null
            if (resolved.length > 0) {
                const totalHours = resolved.reduce((acc, i) => {
                    const created = new Date(i.created_at).getTime()
                    const resolvedAt = new Date(i.resolved_at).getTime()
                    return acc + (resolvedAt - created) / (1000 * 60 * 60)
                }, 0)
                avgH = Math.round((totalHours / resolved.length) * 10) / 10
            }

            setIncidents(incidentsData || [])
            setMessages(messagesData || [])
            setAvgResponseHours(avgH)

        } catch (error) {
            console.error("Error fetching support data:", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Support & Incidents</h1>
                    <p className="text-muted-foreground">
                        Gestion des réclamations clients et des incidents logistiques.
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Incidents Ouverts</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {incidents.filter(i => i.status === 'OPEN').length}
                        </div>
                        <p className="text-xs text-muted-foreground">Nécessitent une intervention</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Messages Non Lus</CardTitle>
                        <MessageSquare className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {messages.filter(m => !m.is_read).length}
                        </div>
                        <p className="text-xs text-muted-foreground">Demandes de renseignements</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Temps de Réponse</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {avgResponseHours != null ? `${avgResponseHours}h` : "—"}
                        </div>
                        <p className="text-xs text-muted-foreground">Moyenne sur 7 jours (incidents résolus)</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="incidents" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="incidents">Incidents ({incidents.length})</TabsTrigger>
                    <TabsTrigger value="messages">Messages ({messages.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="incidents" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Liste des Incidents</CardTitle>
                            <CardDescription>Problèmes signalés sur les commandes en cours</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Commande</TableHead>
                                        <TableHead>Client</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {incidents.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Aucun incident signalé</TableCell>
                                        </TableRow>
                                    ) : (
                                        incidents.map(incident => (
                                            <TableRow key={incident.id}>
                                                <TableCell>{new Date(incident.created_at).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <Badge variant={incident.type === 'FRAUD' ? 'destructive' : 'outline'}>
                                                        {incident.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">{incident.order?.reference}</TableCell>
                                                <TableCell>{incident.order?.request?.buyer?.full_name || "Inconnu"}</TableCell>
                                                <TableCell>
                                                    <Badge variant={incident.status === 'RESOLVED' ? 'default' : 'secondary'}>
                                                        {incident.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm">Gérer</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="messages" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Messagerie</CardTitle>
                            <CardDescription>Derniers messages reçus</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Expéditeur</TableHead>
                                        <TableHead>Message</TableHead>
                                        <TableHead>Lu</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {messages.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Aucun message</TableCell>
                                        </TableRow>
                                    ) : (
                                        messages.map(msg => (
                                            <TableRow key={msg.id}>
                                                <TableCell>{new Date(msg.created_at).toLocaleDateString()}</TableCell>
                                                <TableCell>{msg.sender?.full_name || msg.sender?.email}</TableCell>
                                                <TableCell className="max-w-md truncate text-muted-foreground">{msg.content}</TableCell>
                                                <TableCell>
                                                    {msg.is_read ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm">Répondre</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
