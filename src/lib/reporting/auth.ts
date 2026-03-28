/**
 * Auth helpers for the Reporting & Audit module.
 * Uses the existing Supabase session + profiles table.
 */

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export type SessionUser = {
  id: string
  role: "ADMIN" | "BUYER" | "PARTNER"
}

/**
 * Returns the authenticated user's id and role,
 * or a 401/403 NextResponse if the check fails.
 */
export async function getSessionUser(): Promise<SessionUser | NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: "Profil introuvable." }, { status: 403 })
  }

  return { id: user.id, role: profile.role as "ADMIN" | "BUYER" | "PARTNER" }
}

/**
 * Asserts the caller has the ADMIN role.
 * Returns the user or a 403 response.
 */
export async function requireAdmin(): Promise<SessionUser | NextResponse> {
  const result = await getSessionUser()
  if (result instanceof NextResponse) return result
  if (result.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Accès refusé — Vue administrateur uniquement." },
      { status: 403 },
    )
  }
  return result
}

/**
 * Asserts the caller is authenticated and owns the requested clientId.
 * CLIENT can only access their own data (clientId must equal their profile UUID).
 */
export async function requireClientAccess(
  clientId: string,
): Promise<SessionUser | NextResponse> {
  const result = await getSessionUser()
  if (result instanceof NextResponse) return result

  // ADMIN may access any client
  if (result.role === "ADMIN") return result

  if (result.id !== clientId) {
    return NextResponse.json(
      { error: "Accès refusé — Données client tiers." },
      { status: 403 },
    )
  }
  return result
}
