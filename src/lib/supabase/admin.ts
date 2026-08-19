import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Client Supabase "service role" — BYPASS le RLS.
 *
 * ⚠️ USAGE STRICTEMENT RÉSERVÉ AUX OPÉRATIONS SYSTÈME, jamais aux requêtes
 * pilotées par un utilisateur :
 *   - écriture des journaux d'audit (audit_logs n'a volontairement pas de policy INSERT),
 *   - webhooks signés (Stripe, Resend, n8n) où il n'y a pas de session utilisateur.
 *
 * Pour toute route utilisateur, utiliser le client SSR (RLS) via `@/lib/supabase/server`
 * + le guard `requireUser` / `requireRole` (`@/lib/auth-guard`).
 *
 * Ne JAMAIS importer ce module dans un composant client.
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'createAdminClient: NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis'
    )
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

let cached: SupabaseClient | null = null

/**
 * Client service role partagé, construit au premier usage.
 *
 * Plusieurs routes le fabriquaient au chargement du module. `next build`
 * important chaque route pour collecter les données de page, une variable
 * d'environnement manquante faisait alors échouer la compilation entière —
 * y compris pour les routes qui ne touchent pas à Supabase. Ce proxy diffère la
 * construction jusqu'au premier accès : le build passe sans secrets, et
 * l'absence de configuration se signale à l'exécution, là où elle compte.
 *
 * Mêmes réserves d'usage que `createAdminClient` : opérations système
 * uniquement, jamais dans un composant client.
 */
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    if (!cached) cached = createAdminClient()
    return Reflect.get(cached, prop, receiver)
  },
})
