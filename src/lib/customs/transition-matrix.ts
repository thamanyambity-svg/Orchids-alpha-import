/**
 * Matrice de transitions — partagée client / serveur.
 * Ne pas importer depuis un fichier "use server".
 */

import type { CustomsFileStatus } from '@/lib/customs/types'

export function normalizeCustomsActorRole(role: string): string {
  if (role === 'PARTNER') return 'PARTNER_COUNTRY'
  return role
}

const ALLOWED_TRANSITIONS: Record<
  string,
  Partial<Record<CustomsFileStatus, CustomsFileStatus[]>>
> = {
  ADMIN: {
    DRAFT: ['PRE_ADVICE', 'BLOCKED'],
    PRE_ADVICE: ['IN_CUSTOMS', 'BLOCKED'],
    IN_CUSTOMS: ['LIQUIDATED', 'BLOCKED'],
    LIQUIDATED: ['PAID', 'BLOCKED'],
    PAID: ['RELEASED', 'BLOCKED'],
    RELEASED: [],
    BLOCKED: ['DRAFT', 'PRE_ADVICE', 'IN_CUSTOMS', 'LIQUIDATED', 'PAID'],
  },

  PARTNER_COUNTRY: {
    DRAFT: ['PRE_ADVICE'],
    PRE_ADVICE: ['IN_CUSTOMS'],
    IN_CUSTOMS: ['LIQUIDATED'],
    LIQUIDATED: ['PAID'],
    PAID: [],
    RELEASED: [],
    BLOCKED: [],
  },

  FISCAL_CONSULTANT: {
    DRAFT: ['BLOCKED'],
    PRE_ADVICE: ['BLOCKED'],
    IN_CUSTOMS: ['BLOCKED'],
    LIQUIDATED: ['BLOCKED'],
    PAID: ['BLOCKED'],
    RELEASED: [],
    BLOCKED: ['DRAFT', 'PRE_ADVICE', 'IN_CUSTOMS', 'LIQUIDATED', 'PAID'],
  },

  ACCOUNTANT: {},
}

export function verifyTransitionAllowed(
  currentStatus: CustomsFileStatus,
  newStatus: CustomsFileStatus,
  role: string
): { allowed: boolean; reason?: string } {
  const actor = normalizeCustomsActorRole(role)

  if (actor === 'ACCOUNTANT') {
    return {
      allowed: false,
      reason:
        'Le rôle Comptable ne peut pas modifier le statut douanier. ' +
        'Utilisez la validation comptable dédiée.',
    }
  }

  if (currentStatus === newStatus) {
    return {
      allowed: false,
      reason: `Le dossier est déjà en statut ${currentStatus}.`,
    }
  }

  if (currentStatus === 'RELEASED') {
    return {
      allowed: false,
      reason:
        'Le dossier est libéré (RELEASED). Aucune modification n’est possible.',
    }
  }

  const roleTransitions = ALLOWED_TRANSITIONS[actor]
  if (!roleTransitions) {
    return {
      allowed: false,
      reason: `Aucune transition définie pour le rôle ${role}.`,
    }
  }

  const allowedTargets = roleTransitions[currentStatus] ?? []

  if (!allowedTargets.includes(newStatus)) {
    return {
      allowed: false,
      reason:
        `Transition ${currentStatus} → ${newStatus} non autorisée ` +
        `pour le rôle ${role}. ` +
        `Transitions disponibles : ${allowedTargets.join(', ') || 'aucune'}.`,
    }
  }

  return { allowed: true }
}
