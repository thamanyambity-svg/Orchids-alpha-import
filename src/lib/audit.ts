import { createClient } from "@/lib/supabase/server"

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
  details?: any
  actorId?: string
}) {
  const supabase = await createClient()

  // If actorId is not provided, try to get it from session
  let finalActorId = actorId
  if (!finalActorId) {
    const { data: { user } } = await supabase.auth.getUser()
    finalActorId = user?.id
  }

  const { error } = await supabase
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
