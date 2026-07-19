import { NextRequest, NextResponse } from 'next/server'
import { sendToN8N } from '@/lib/webhooks'
import { requireRole, handleApiError } from '@/lib/auth-guard'
import { executeTransition } from '@/lib/workflow'

export async function POST(request: NextRequest) {
  try {
    // Réservé PARTNER/ADMIN. Le client SSR (RLS) garantit qu'un partenaire ne
    // peut agir que sur les demandes qui lui sont assignées.
    const { supabase, user, role } = await requireRole(['PARTNER', 'ADMIN'])

    const body = await request.json()
    const { requestId, status } = body

    if (!requestId || !status) {
      return NextResponse.json({ error: 'Missing requestId or status' }, { status: 400 })
    }

    // Passage OBLIGATOIRE par la machine à états : valide la transition + le rôle.
    // Plus aucune écriture directe de `status` (le court-circuit est supprimé).
    await executeTransition(supabase, 'REQUEST', requestId, status, user.id, role)

    // Récupère la demande à jour (RLS-safe) pour la notification n8n.
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
  } catch (error: unknown) {
    // Transition illégale (mauvais from/to ou rôle) => 403 explicite.
    if (error instanceof Error && error.message.startsWith('Transition forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return handleApiError(error)
  }
}
