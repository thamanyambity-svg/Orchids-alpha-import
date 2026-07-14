import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserRole } from '@/lib/types'

/**
 * Auth guard centralisé pour les routes API.
 *
 * Objectif : remplacer l'usage anarchique de SUPABASE_SERVICE_ROLE_KEY (qui bypass
 * le RLS) par un point d'entrée unique qui :
 *   1. exige un utilisateur authentifié (session SSR / cookies),
 *   2. vérifie son rôle dans la table `profiles`,
 *   3. renvoie le client Supabase SSR (soumis au RLS) à utiliser dans la route.
 *
 * Stratégie retenue : SSR (RLS) par défaut. On ne recourt à service_role que pour
 * de vraies opérations système (webhooks signés), jamais dans les routes utilisateur.
 */

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

export interface AuthContext {
  user: { id: string; email?: string }
  role: UserRole
  supabase: SupabaseClient
}

/**
 * Exige un utilisateur authentifié. Renvoie son identité, son rôle et le client SSR.
 * Lève ApiError(401) si non connecté.
 */
export async function requireUser(): Promise<AuthContext> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new ApiError(401, 'Unauthorized')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile?.role) {
    // Utilisateur authentifié mais sans profil/rôle exploitable.
    throw new ApiError(403, 'Forbidden: no role assigned')
  }

  return {
    user: { id: user.id, email: user.email },
    role: profile.role as UserRole,
    supabase,
  }
}

/**
 * Exige un utilisateur authentifié ET dont le rôle figure dans `roles`.
 * Lève ApiError(401) si non connecté, ApiError(403) si rôle non autorisé.
 */
export async function requireRole(roles: UserRole[]): Promise<AuthContext> {
  const ctx = await requireUser()

  if (!roles.includes(ctx.role)) {
    throw new ApiError(403, `Forbidden: requires one of [${roles.join(', ')}]`)
  }

  return ctx
}

/**
 * Convertit une erreur capturée en réponse JSON normalisée.
 * Préserve le status des ApiError, fallback en 500 sinon (sans fuiter le détail interne).
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error('Unhandled API error:', error)
  return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
}
