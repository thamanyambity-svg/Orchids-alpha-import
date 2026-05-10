import { describe, expect, it } from 'vitest'
import {
  canTransitionOrder,
  canTransitionRequest,
  getNextPossibleStatuses,
  orderTargetForPartnerMirroredStatus,
} from './workflow'

describe('canTransitionRequest', () => {
  it('autorise ADMIN à passer ANALYSIS → VALIDATED', () => {
    expect(canTransitionRequest('ANALYSIS', 'VALIDATED', 'ADMIN')).toBe(true)
  })

  it('refuse PARTNER pour ANALYSIS → VALIDATED', () => {
    expect(canTransitionRequest('ANALYSIS', 'VALIDATED', 'PARTNER')).toBe(false)
  })

  it('autorise PARTNER pour PENDING → ANALYSIS', () => {
    expect(canTransitionRequest('PENDING', 'ANALYSIS', 'PARTNER')).toBe(true)
  })
})

describe('canTransitionOrder', () => {
  it('autorise PARTNER SOURCING → PURCHASED', () => {
    expect(canTransitionOrder('SOURCING', 'PURCHASED', 'PARTNER')).toBe(true)
  })

  it('refuse PARTNER FUNDED → SOURCING (réservé admin)', () => {
    expect(canTransitionOrder('FUNDED', 'SOURCING', 'PARTNER')).toBe(false)
  })

  it('autorise ADMIN FUNDED → SOURCING', () => {
    expect(canTransitionOrder('FUNDED', 'SOURCING', 'ADMIN')).toBe(true)
  })

  it('autorise PARTNER PURCHASED → SHIPPED', () => {
    expect(canTransitionOrder('PURCHASED', 'SHIPPED', 'PARTNER')).toBe(true)
  })

  it('autorise PARTNER SHIPPED → DELIVERED', () => {
    expect(canTransitionOrder('SHIPPED', 'DELIVERED', 'PARTNER')).toBe(true)
  })
})

describe('getNextPossibleStatuses', () => {
  it('liste les statuts suivants pour PARTNER en SOURCING', () => {
    expect(getNextPossibleStatuses('SOURCING', 'PARTNER')).toEqual(['PURCHASED'])
  })
})

describe('orderTargetForPartnerMirroredStatus', () => {
  it('EXECUTING + SOURCING → PURCHASED', () => {
    expect(orderTargetForPartnerMirroredStatus('EXECUTING', 'SOURCING')).toBe(
      'PURCHASED'
    )
  })

  it('EXECUTING + FUNDED → null', () => {
    expect(orderTargetForPartnerMirroredStatus('EXECUTING', 'FUNDED')).toBeNull()
  })

  it('SHIPPED + PURCHASED → SHIPPED', () => {
    expect(orderTargetForPartnerMirroredStatus('SHIPPED', 'PURCHASED')).toBe(
      'SHIPPED'
    )
  })

  it('DELIVERED + SHIPPED → DELIVERED', () => {
    expect(orderTargetForPartnerMirroredStatus('DELIVERED', 'SHIPPED')).toBe(
      'DELIVERED'
    )
  })

  it('SHIPPED + SOURCING → null', () => {
    expect(orderTargetForPartnerMirroredStatus('SHIPPED', 'SOURCING')).toBeNull()
  })
})
