"use client"

import { useEffect, useState } from "react"
import { 
  BarChart3, 
  Download, 
  History, 
  TrendingUp, 
  Activity,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export default function ReportingPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/reporting/stats')
      const result = await res.json()
      if (result.error) throw new Error(result.error)
      setData(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleExport() {
    window.open('/api/admin/reporting/export', '_blank')
  }

  if (loading) return <div className="p-8">Chargement du rapport...</div>
  if (error) return <div className="p-8 text-destructive">Erreur: {error}</div>

  const { stats, auditLogs } = data

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reporting & Audit</h1>
          <p className="text-muted-foreground">Vue d&apos;ensemble de l&apos;activité et traçabilité Alpha.</p>
        </div>
        <Button onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" />
          Exporter CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Volume Total (Projeté)</CardTitle>
            <TrendingUp className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVolume.toLocaleString()} €</div>
            <p className="text-xs text-muted-foreground">Cumul des budgets max validés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Demandes Actives</CardTitle>
            <Activity className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeRequests}</div>
            <p className="text-xs text-muted-foreground">Hors brouillons et clôturées</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Transactions Encaissées</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions.toLocaleString()} €</div>
            <p className="text-xs text-muted-foreground">Somme des paiements confirmés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Taux de Résolution</CardTitle>
            <BarChart3 className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.5%</div>
            <p className="text-xs text-muted-foreground">+0.5% ce mois-ci</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Journal d&apos;Audit (Dernières actions)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {auditLogs.map((log: any) => (
                <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg border bg-card/50">
                  <div className={`mt-1 w-2 h-2 rounded-full ${
                    log.action.includes('REJECT') || log.action.includes('DELETE') 
                    ? 'bg-destructive' 
                    : 'bg-primary'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">
                        {log.action} - <span className="text-muted-foreground font-normal">{log.target_type}</span>
                      </p>
                      <time className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </time>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      Par: {log.actor?.full_name || 'Système'} ({log.actor?.email || 'automated'})
                    </p>
                    {log.details && (
                      <pre className="text-[10px] mt-2 p-2 bg-secondary rounded overflow-auto max-h-24">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun log d&apos;audit disponible.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribution des Statuts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.statusDistribution).map(([status, count]: [string, any]) => (
                <div key={status} className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/50 transition-colors">
                  <Badge variant="outline" className="font-mono">{status}</Badge>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
