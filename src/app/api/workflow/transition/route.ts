import { NextRequest, NextResponse } from 'next/server'
import { requireUser, handleApiError } from '@/lib/auth-guard'
import {
    canTransitionRequest,
    canTransitionOrder,
    executeTransition,
    REQUEST_TRANSITIONS,
    ORDER_TRANSITIONS
} from '@/lib/workflow'
import { UserRole, RequestStatus, OrderStatus } from '@/lib/types'
import { transitionPayloadSchema } from '@/lib/validation'

// Define request body types for stronger typing
type TransitionRequest = {
    type: 'REQUEST' | 'ORDER'
    id: string
    targetStatus: string // Using string here but casting later
    reason?: string
}

export async function POST(request: NextRequest) {
  try {
    // Session, rôle et client SSR viennent du garde partagé. Cette route
    // reconstruisait le client à la main et relisait le profil elle-même :
    // c'était une quatrième implémentation du même contrôle d'accès, et la
    // seule non couverte par les tests du garde.
    //
    // L'appel est à l'intérieur du try : sinon un 401 ou un 403 levé par le
    // garde remonterait non capturé et sortirait en 500 générique.
    const { supabase, user, role: userRole } = await requireUser()

    // 3. Parse Request
    let body: TransitionRequest
    try {
        body = transitionPayloadSchema.parse(await request.json()) as TransitionRequest
    } catch {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    const { type, id, targetStatus, reason } = body

    if (type === 'REQUEST') {
            // Fetch current status
            const { data: reqData, error: fetchError } = await supabase
                .from('import_requests')
                .select('status, buyer_id')
                .eq('id', id)
                .single() // Verify RLS

            if (fetchError || !reqData) {
                return NextResponse.json({ error: 'Request not found' }, { status: 404 })
            }

            const currentStatus = reqData.status as RequestStatus
            const target = targetStatus as RequestStatus

            // Security Check: Is transition allowed?
            if (!canTransitionRequest(currentStatus, target, userRole)) {
                return NextResponse.json({
                    error: `Transition forbidden: ${currentStatus} -> ${target} for role ${userRole}`
                }, { status: 403 })
            }

            // Execute Transition
            const { error: updateError } = await supabase
                .from('import_requests')
                .update({
                    status: target,
                    updated_at: new Date().toISOString(),
                    admin_notes: reason ? reason : undefined // Only admin usually adds notes here
                })
                .eq('id', id)

            if (updateError) throw updateError

            // Log to Audit Trail
            await supabase.from('audit_logs').insert({
                actor_id: user.id,
                action: 'TRANSITION_REQUEST',
                target_type: 'import_requests',
                target_id: id,
                details: { from: currentStatus, to: target, reason }
            })

            return NextResponse.json({ success: true, newStatus: target })

        } else if (type === 'ORDER') {
            // Fetch current status
            const { data: orderData, error: fetchError } = await supabase
                .from('orders')
                .select('status')
                .eq('id', id)
                .single()

            if (fetchError || !orderData) {
                return NextResponse.json({ error: 'Order not found' }, { status: 404 })
            }

            const currentStatus = orderData.status as OrderStatus
            const target = targetStatus as OrderStatus

            // Security Check
            // We need to import canTransitionOrder properly if it was named differently
            // Assuming canTransitionOrder exists as per previous file creation
            if (!canTransitionOrder(currentStatus, target, userRole)) {
                return NextResponse.json({
                    error: `Transition forbidden: ${currentStatus} -> ${target} for role ${userRole}`
                }, { status: 403 })
            }

            // Execute Transition
            const { error: updateError } = await supabase
                .from('orders')
                .update({
                    status: target,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)

            if (updateError) throw updateError

            // Log to Audit Trail
            await supabase.from('audit_logs').insert({
                actor_id: user.id,
                action: 'TRANSITION_ORDER',
                target_type: 'orders',
                target_id: id,
                details: { from: currentStatus, to: target }
            })

            return NextResponse.json({ success: true, newStatus: target })
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })

  } catch (error) {
    // handleApiError préserve les statuts du garde au lieu de tout aplatir.
    console.error('Workflow Transition Error:', error)
    return handleApiError(error)
  }
}
