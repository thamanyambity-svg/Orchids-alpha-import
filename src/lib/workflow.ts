import {
    RequestStatus,
    OrderStatus,
    UserRole
} from './types'
import { sendStatusNotification } from './notifications'

// --- Definitions ---

interface Transition<T extends string> {
    from: T
    to: T
    allowedRoles: UserRole[]
    requiredAction?: string
}

// --- Request Workflow ---

export const REQUEST_TRANSITIONS: Transition<RequestStatus>[] = [
    {
        from: 'DRAFT',
        to: 'PENDING',
        allowedRoles: ['BUYER'],
        requiredAction: 'submit_request'
    },
    {
        from: 'PENDING',
        to: 'ANALYSIS',
        allowedRoles: ['ADMIN', 'PARTNER'],
        requiredAction: 'start_analysis'
    },
    {
        from: 'ANALYSIS',
        to: 'VALIDATED',
        allowedRoles: ['ADMIN'], // Only Admin confirms final quote
        requiredAction: 'validate_quote'
    },
    {
        from: 'ANALYSIS',
        to: 'REJECTED',
        allowedRoles: ['ADMIN'],
        requiredAction: 'reject_request'
    },
    // Auto-transition usually handled by system when Order is created
    {
        from: 'VALIDATED',
        to: 'AWAITING_DEPOSIT',
        allowedRoles: ['ADMIN'],
        requiredAction: 'generate_order'
    }
]

// --- Order Workflow (The "60/40" Engine) ---

export const ORDER_TRANSITIONS: Transition<OrderStatus>[] = [
    {
        from: 'PENDING',
        to: 'AWAITING_DEPOSIT',
        allowedRoles: ['BUYER'], // Buyer accepts the quote
        requiredAction: 'accept_quote'
    },
    {
        from: 'AWAITING_DEPOSIT',
        to: 'FUNDED',
        allowedRoles: ['ADMIN'], // System (Stripe Webhook) or Admin manual confirm
        requiredAction: 'confirm_deposit_60'
    },
    {
        from: 'FUNDED',
        to: 'SOURCING',
        allowedRoles: ['ADMIN'], // Admin gives "Green Light" to Partner
        requiredAction: 'authorize_sourcing'
    },
    {
        from: 'SOURCING',
        to: 'PURCHASED',
        allowedRoles: ['PARTNER'], // Partner confirms purchase with proof
        requiredAction: 'confirm_purchase'
    },
    {
        from: 'PURCHASED',
        to: 'SHIPPED',
        allowedRoles: ['PARTNER'], // Partner provides tracking
        requiredAction: 'confirm_shipping'
    },
    {
        from: 'SHIPPED',
        to: 'DELIVERED',
        allowedRoles: ['PARTNER', 'ADMIN'], // Delivery at warehouse
        requiredAction: 'confirm_delivery'
    },
    {
        from: 'DELIVERED',
        to: 'AWAITING_BALANCE',
        allowedRoles: ['ADMIN'], // System auto-trigger usually
        requiredAction: 'request_balance_40'
    },
    {
        from: 'AWAITING_BALANCE',
        to: 'CLOSED',
        allowedRoles: ['ADMIN'], // System/Admin confirms final payment
        requiredAction: 'confirm_balance_40'
    }
]

// --- Validation Functions ---

export function canTransitionRequest(
    currentStatus: RequestStatus,
    targetStatus: RequestStatus,
    userRole: UserRole
): boolean {
    const transition = REQUEST_TRANSITIONS.find(
        t => t.from === currentStatus && t.to === targetStatus
    )
    if (!transition) return false
    return transition.allowedRoles.includes(userRole)
}

export function canTransitionOrder(
    currentStatus: OrderStatus,
    targetStatus: OrderStatus,
    userRole: UserRole
): boolean {
    const transition = ORDER_TRANSITIONS.find(
        t => t.from === currentStatus && t.to === targetStatus
    )
    if (!transition) return false
    return transition.allowedRoles.includes(userRole)
}

export function getNextPossibleStatuses(
    currentStatus: OrderStatus,
    userRole: UserRole
): OrderStatus[] {
    return ORDER_TRANSITIONS
        .filter(t => t.from === currentStatus && t.allowedRoles.includes(userRole))
        .map(t => t.to)
}

// --- Shared Execution Logic ---

import { SupabaseClient } from '@supabase/supabase-js'

export async function executeTransition(
    supabase: SupabaseClient,
    type: 'REQUEST' | 'ORDER',
    id: string,
    targetStatus: string,
    userId: string,
    userRole: UserRole,
    reason?: string
) {
    if (type === 'REQUEST') {
        // Fetch current status
        const { data: reqData, error: fetchError } = await supabase
            .from('import_requests')
            .select('status')
            .eq('id', id)
            .single()

        if (fetchError || !reqData) throw new Error('Request not found')

        const currentStatus = reqData.status as RequestStatus
        const target = targetStatus as RequestStatus

        // Security Check
        if (!canTransitionRequest(currentStatus, target, userRole)) {
            throw new Error(`Transition forbidden: ${currentStatus} -> ${target} for role ${userRole}`)
        }

        // Execute
        const { error: updateError } = await supabase
            .from('import_requests')
            .update({
                status: target,
                updated_at: new Date().toISOString(),
                admin_notes: reason ? reason : undefined
            })
            .eq('id', id)

        if (updateError) throw updateError

        // Audit Log
        await supabase.from('audit_logs').insert({
            actor_id: userId,
            action: 'TRANSITION_REQUEST',
            target_type: 'import_requests',
            target_id: id,
            details: { from: currentStatus, to: target, reason }
        })

        // --- Notification Trigger ---
        try {
            const { data: requestWithBuyer } = await supabase
                .from('import_requests')
                .select(`
                    buyer_id,
                    buyer:profiles!buyer_id(email, full_name)
                `)
                .eq('id', id)
                .single()

            if (requestWithBuyer?.buyer) {
                const buyer = requestWithBuyer.buyer as any
                await sendStatusNotification(
                    buyer.email,
                    buyer.full_name || 'Client',
                    target,
                    undefined
                )
            }
        } catch (error) {
            console.error('⚠️ Notification failed:', error)
        }

        // --- Auto-Generate Order on VALIDATED -> AWAITING_DEPOSIT ---
        if (target === 'AWAITING_DEPOSIT') {
            // Fetch full request details to create order
            const { data: requestData } = await supabase
                .from('import_requests')
                .select('*')
                .eq('id', id)
                .single()

            if (requestData) {
                const amount = requestData.budget_max || requestData.budget_min || 0
                const commission = amount * 0.10 // 10% default
                const payout = amount - commission

                // Generate Order Reference (Max 20 chars)
                let baseRef = requestData.reference || 'REF'
                if (baseRef.length > 15) {
                    baseRef = baseRef.slice(-15)
                }
                const orderRef = `ORD-${baseRef}`

                const { error: orderError } = await supabase.from('orders').insert({
                    request_id: id,
                    reference: orderRef,
                    total_amount: amount,
                    alpha_commission: commission,
                    partner_payout: payout,
                    status: 'PENDING', // Starts as PENDING for User to Accept
                    deposit_amount: amount * 0.60,
                    balance_amount: amount * 0.40,
                    validated_by_admin: true,
                    deposit_paid: false,
                    balance_paid: false,
                    is_frozen: false,
                    escrow_activated: false
                })

                if (orderError) {
                    console.error("Failed to auto-generate order:", orderError)
                    throw orderError
                }
            }
        }

        return { success: true, newStatus: target }
    } else if (type === 'ORDER') {
        const { data: orderData, error: fetchError } = await supabase
            .from('orders')
            .select('status')
            .eq('id', id)
            .single()

        if (fetchError || !orderData) throw new Error('Order not found')

        const currentStatus = orderData.status as OrderStatus
        const target = targetStatus as OrderStatus

        if (!canTransitionOrder(currentStatus, target, userRole)) {
            throw new Error(`Transition forbidden: ${currentStatus} -> ${target} for role ${userRole}`)
        }

        const { error: updateError } = await supabase
            .from('orders')
            .update({
                status: target,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (updateError) throw updateError

        // Audit Log
        await supabase.from('audit_logs').insert({
            actor_id: userId,
            action: 'TRANSITION_ORDER',
            target_type: 'orders',
            target_id: id,
            details: { from: currentStatus, to: target }
        })

        // --- Notification Trigger ---
        try {
            const { data: orderWithBuyer } = await supabase
                .from('orders')
                .select(`
                    request:import_requests(
                        buyer:profiles!buyer_id(email, full_name)
                    )
                `)
                .eq('id', id)
                .single()

            if (orderWithBuyer?.request) {
                const buyer = (orderWithBuyer.request as any).buyer
                if (buyer) {
                    await sendStatusNotification(
                        buyer.email,
                        buyer.full_name || 'Client',
                        target,
                        id
                    )
                }
            }
        } catch (error) {
            console.error('⚠️ Notification failed:', error)
        }

        return { success: true, newStatus: target }
    }
}
