"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DashboardHeader } from '@/components/dashboard/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bot, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function AdminSourcingMonitorPage() {
  const supabase = createClient()
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSessions() {
      // Fetch all sessions for Admin
      const { data: sessionsData } = await supabase
        .from('sourcing_sessions')
        .select(`
          *,
          request:import_requests(reference, category),
          partner:partner_profiles(user_id, profiles!user_id(full_name, country:countries(name)))
        `)
        .order('created_at', { ascending: false })

      setSessions(sessionsData || [])
      setLoading(false)
    }

    loadSessions()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 animate-pulse">En cours d'analyse</Badge>
      case 'PENDING_REVIEW':
        return <Badge className="bg-amber-100 text-amber-800">En attente Partner</Badge>
      case 'VALIDATED':
        return <Badge className="bg-purple-100 text-purple-800">Validé</Badge>
      case 'SENT':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> RFQ Envoyés</Badge>
      case 'FAILED':
        return <Badge variant="destructive">Échec IA</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2 mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="w-8 h-8 text-primary" /> Supervision Sourcing IA
          </h2>
          <p className="text-muted-foreground mt-1">
            Vision globale de toutes les sessions de sourcing automatisées.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-12 text-gray-500">Chargement des sessions...</div>
      ) : sessions.length === 0 ? (
        <Card className="bg-gray-50/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Bot className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune session de sourcing</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              Aucune activité de l'agent de sourcing n'a été enregistrée pour le moment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sessions.map((session) => (
            <Card key={session.id} className="hover:shadow-sm transition-shadow">
              <CardHeader className="pb-3 border-b border-gray-100 bg-gray-50/30">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      Ref: {session.request?.reference}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {session.request?.category}
                    </p>
                  </div>
                  {getStatusBadge(session.status)}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Partenaire:</span>
                      <span className="font-medium text-gray-900">
                        {session.partner?.profiles?.full_name} ({session.partner?.profiles?.country?.name})
                      </span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Création:</span>
                      <span className="text-gray-900 flex items-center gap-1">
                         <Clock className="w-3 h-3" />
                         {format(new Date(session.created_at), 'd MMM yyyy, HH:mm')}
                      </span>
                   </div>
                   <div className="flex justify-between items-center text-sm border-t pt-3 mt-3">
                      <span className="text-gray-500">Performance IA:</span>
                      <span className="font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded">
                        {session.matches_count} / {session.suppliers_evaluated} matches
                      </span>
                   </div>
                   {session.status === 'FAILED' && (
                     <div className="text-xs text-red-600 bg-red-50 p-2 rounded mt-2 border border-red-100 flex gap-2">
                       <AlertCircle className="w-4 h-4 flex-shrink-0" /> {session.error_message}
                     </div>
                   )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
