import { NextResponse } from "next/server"
import { z } from "zod"
import { requireUser, handleApiError, ApiError } from "@/lib/auth-guard"

const schema = z.object({ id: z.string().uuid() })

/**
 * Marque une notification comme lue.
 *
 * Le filtre sur user_id reste : c'est lui qui empêche de marquer la
 * notification d'un autre. L'identifiant est désormais validé — une chaîne
 * quelconque partait jusqu'à la base pour y échouer en erreur de type.
 */
export async function POST(req: Request) {
  try {
    const { supabase, user } = await requireUser()

    const parsed = schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      throw new ApiError(400, "id doit être un UUID")
    }

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", parsed.data.id)
      .eq("user_id", user.id)

    if (error) {
      console.error("[POST /api/notifications/mark-read]", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
