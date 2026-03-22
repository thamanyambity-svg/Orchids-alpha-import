'use server'

import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

/**
 * Session acheteur (cookie) — pour Server Actions côté client.
 */
export async function requireAuthenticatedUser(): Promise<User> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Non authentifié.')
  }

  return user
}

/**
 * Vérifie que la commande appartient à l’acheteur (via import_requests.buyer_id).
 */
export async function verifyOrderOwnership(
  orderId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient()

  const { data: order, error: oErr } = await supabase
    .from('orders')
    .select('request_id')
    .eq('id', orderId)
    .maybeSingle()

  if (oErr || !order?.request_id) {
    throw new Error('Commande introuvable.')
  }

  const { data: req, error: rErr } = await supabase
    .from('import_requests')
    .select('buyer_id')
    .eq('id', order.request_id)
    .maybeSingle()

  if (rErr || !req || req.buyer_id !== userId) {
    throw new Error('Accès refusé.')
  }
}
