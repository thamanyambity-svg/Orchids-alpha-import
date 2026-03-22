import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types'
import type { ServerActionResult } from './result'

export type AdminContext = {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  role: UserRole
}

/**
 * Vérifie session + rôle ADMIN pour les Server Actions.
 */
export async function requireAdmin(): Promise<ServerActionResult<AdminContext>> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Non authentifié' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'ADMIN') {
    return { success: false, error: 'Accès réservé aux administrateurs' }
  }

  return {
    success: true,
    data: { supabase, userId: user.id, role: profile.role as UserRole },
  }
}
