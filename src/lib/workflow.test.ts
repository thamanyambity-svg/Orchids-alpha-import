import { describe, it, expect } from 'vitest'
import {
    REQUEST_TRANSITIONS,
    ORDER_TRANSITIONS,
    canTransitionRequest,
    canTransitionOrder,
    getNextPossibleStatuses
} from './workflow'

// --- REQUEST_TRANSITIONS ---

describe('REQUEST_TRANSITIONS', () => {
    it('contains transitions starting from DRAFT', () => {
        const fromDraft = REQUEST_TRANSITIONS.filter(t => t.from === 'DRAFT')
        expect(fromDraft.length).toBeGreaterThan(0)
        expect(fromDraft[0].to).toBe('PENDING')
    })

    it('every transition has at least one allowed role', () => {
        for (const t of REQUEST_TRANSITIONS) {
            expect(t.allowedRoles.length).toBeGreaterThan(0)
        }
    })
})

// --- ORDER_TRANSITIONS ---

describe('ORDER_TRANSITIONS', () => {
    it('contains the full order lifecycle', () => {
        const statuses = ORDER_TRANSITIONS.map(t => t.to)
        expect(statuses).toContain('FUNDED')
        expect(statuses).toContain('SOURCING')
        expect(statuses).toContain('PURCHASED')
        expect(statuses).toContain('SHIPPED')
        expect(statuses).toContain('DELIVERED')
        expect(statuses).toContain('CLOSED')
    })
})

// --- canTransitionRequest ---

describe('canTransitionRequest', () => {
    it('allows BUYER to move DRAFT → PENDING', () => {
        expect(canTransitionRequest('DRAFT', 'PENDING', 'BUYER')).toBe(true)
    })

    it('forbids BUYER from PENDING → ANALYSIS', () => {
        expect(canTransitionRequest('PENDING', 'ANALYSIS', 'BUYER')).toBe(false)
    })

    it('allows ADMIN to move PENDING → ANALYSIS', () => {
        expect(canTransitionRequest('PENDING', 'ANALYSIS', 'ADMIN')).toBe(true)
    })

    it('allows ADMIN to reject from ANALYSIS', () => {
        expect(canTransitionRequest('ANALYSIS', 'REJECTED', 'ADMIN')).toBe(true)
    })

    it('returns false for non-existent transition', () => {
        expect(canTransitionRequest('DRAFT', 'CLOSED', 'ADMIN')).toBe(false)
    })
})

// --- canTransitionOrder ---

describe('canTransitionOrder', () => {
    it('allows BUYER to accept quote (PENDING → AWAITING_DEPOSIT)', () => {
        expect(canTransitionOrder('PENDING', 'AWAITING_DEPOSIT', 'BUYER')).toBe(true)
    })

    it('forbids PARTNER from confirming deposit', () => {
        expect(canTransitionOrder('AWAITING_DEPOSIT', 'FUNDED', 'PARTNER')).toBe(false)
    })

    it('allows ADMIN to confirm deposit', () => {
        expect(canTransitionOrder('AWAITING_DEPOSIT', 'FUNDED', 'ADMIN')).toBe(true)
    })

    it('allows PARTNER to confirm purchase', () => {
        expect(canTransitionOrder('SOURCING', 'PURCHASED', 'PARTNER')).toBe(true)
    })

    it('returns false for non-existent transition', () => {
        expect(canTransitionOrder('PENDING', 'CLOSED', 'ADMIN')).toBe(false)
    })
})

// --- getNextPossibleStatuses ---

describe('getNextPossibleStatuses', () => {
    it('returns AWAITING_DEPOSIT for BUYER at PENDING', () => {
        const statuses = getNextPossibleStatuses('PENDING', 'BUYER')
        expect(statuses).toEqual(['AWAITING_DEPOSIT'])
    })

    it('returns SOURCING for ADMIN at FUNDED', () => {
        const statuses = getNextPossibleStatuses('FUNDED', 'ADMIN')
        expect(statuses).toEqual(['SOURCING'])
    })

    it('returns empty array when no transitions are allowed', () => {
        const statuses = getNextPossibleStatuses('CLOSED', 'BUYER')
        expect(statuses).toEqual([])
    })

    it('returns DELIVERED for PARTNER at SHIPPED', () => {
        const statuses = getNextPossibleStatuses('SHIPPED', 'PARTNER')
        expect(statuses).toEqual(['DELIVERED'])
    })
})
