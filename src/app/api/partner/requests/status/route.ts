import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendToN8N } from '@/lib/webhooks'
import { getSessionUser } from '@/lib/reporting/auth'
import { executeTransition } from '@/lib/workflow'

export async function POST(request: NextRequest) {
  // Réservé PARTNER/ADMIN. Client SSR (RLS) : un partenaire ne peut agir que sur
  // les demandes qui lui sont assignées.
  const session = await getSessionUser()
  if (session instanceof NextResponse) return session
  if (session.role !== 'PARTNER' && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const supabase = await createClient()

  try {
    const body = await request.json()
    const { requestId, status } = body

    if (!requestId || !status) {
      return NextResponse.json({ error: 'Missing requestId or status' }, { status: 400 })
    }

    // Passage OBLIGATOIRE par la machine à états (valide transition + rôle).
    // Plus d'écriture directe de `status` (le court-circuit est supprimé).
    await executeTransition(supabase, 'REQUEST', requestId, status, session.id, session.role)

    const { data } = await supabase
      .from('import_requests')
      .select('id, reference, category')
      .eq('id', requestId)
      .single()

    await sendToN8N('partner_status_update', {
      requestId: data?.id ?? requestId,
      reference: data?.reference,
      category: data?.category,
      newStatus: status,
      isAutomobile: data?.category === 'Automobile & Pièces',
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, newStatus: status })
  } catch (error: any) {
    if (error instanceof Error && error.message.startsWith('Transition forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error('Partner status update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update status' },
      { status: 500 }
    )
  }
}
