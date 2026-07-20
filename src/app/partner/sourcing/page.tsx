"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DashboardHeader } from '@/components/dashboard/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bot, ChevronRight, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function PartnerSourcingIndexPage() {
  const router = useRouter()
  const supabase = createClient()
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSessions() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get partner ID
      const { data: profile } = await supabase
        .from('partner_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!profile) return

      // Fetch sessions
      const { data: sessionsData } = await supabase
        .from('sourcing_sessions')
        .select(`
          *,
          request:import_requests(reference, category)
        `)
        .eq('partner_id', profile.id)
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
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">À valider</Badge>
      case 'VALIDATED':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">Validé (Admin info)</Badge>
      case 'SENT':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> RFQ Envoyés</Badge>
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
            <Bot className="w-8 h-8 text-primary" /> Assistant Sourcing IA
          </h2>
          <p className="text-muted-foreground mt-1">
            Gérez les shortlists générées automatiquement par l'IA pour vos demandes d'import.
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
              L'agent IA se déclenchera automatiquement lorsqu'une nouvelle demande passera en phase d'analyse.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <Card 
              key={session.id} 
              className={`hover:shadow-md transition-shadow cursor-pointer ${session.status === 'PENDING_REVIEW' ? 'border-amber-200 ring-1 ring-amber-100' : ''}`}
              onClick={() => router.push(`/partner/sourcing/${session.id}`)}
            >
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
                <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {format(new Date(session.created_at), 'd MMM yyyy, HH:mm', { locale: fr })}
                  </div>
                  <div className="font-medium text-gray-900">
                    {session.matches_count} / {session.suppliers_evaluated} matches
                  </div>
                </div>
                
                <Button variant={session.status === 'PENDING_REVIEW' ? 'default' : 'outline'} className="w-full justify-between group">
                  {session.status === 'PENDING_REVIEW' ? 'Voir et Valider' : 'Consulter'}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
