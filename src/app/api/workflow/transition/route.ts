import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import {
    canTransitionRequest,
    canTransitionOrder,
    executeTransition,
    REQUEST_TRANSITIONS,
    ORDER_TRANSITIONS
} from '@/lib/workflow'
import { UserRole, RequestStatus, OrderStatus } from '@/lib/types'

// Define request body types for stronger typing
type TransitionRequest = {
    type: 'REQUEST' | 'ORDER'
    id: string
    targetStatus: string // Using string here but casting later
    reason?: string
}

export async function POST(request: NextRequest) {
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return request.cookies.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                },
            },
        }
    )

    // 1. Authenticate User
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get User Role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const userRole = profile?.role as UserRole

    // 3. Parse Request
    const body = await request.json() as TransitionRequest
    const { type, id, targetStatus, reason } = body

    try {
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

    } catch (error: any) {
        console.error('Workflow Transition Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
