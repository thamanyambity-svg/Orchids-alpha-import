import { NextResponse } from "next/server"
import { requireUser, handleApiError } from "@/lib/auth-guard"

const MAX = 50

/** Notifications de l'appelant, les plus récentes d'abord. */
export async function GET() {
  try {
    const { supabase, user } = await requireUser()

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(MAX)

    if (error) {
      console.error("[GET /api/notifications]", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const notifications = data ?? []
    return NextResponse.json({
      notifications,
      unreadCount: notifications.filter((n) => !n.is_read).length,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
