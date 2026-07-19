import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function logAudit({
  action,
  targetType,
  targetId,
  details = {},
  actorId
}: {
  action: string
  targetType: string
  targetId?: string
  details?: Record<string, unknown>
  actorId?: string | null
}) {
  // Résolution de l'acteur : valeur explicite prioritaire, sinon session courante.
  let finalActorId = actorId
  if (!finalActorId) {
    try {
      const ssr = await createClient()
      const { data: { user } } = await ssr.auth.getUser()
      finalActorId = user?.id
    } catch {
      // Pas de contexte de session (ex: webhook système) — acteur null assumé.
    }
  }

  // L'écriture d'audit est une opération système : audit_logs n'a pas de policy
  // INSERT côté RLS (volontaire, pour empêcher la falsification). On passe donc
  // par le client service-role isolé.
  const admin = createAdminClient()
  const { error } = await admin
    .from('audit_logs')
    .insert({
      actor_id: finalActorId,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
    })

  if (error) {
    console.error('Failed to log audit:', error)
  }
}
