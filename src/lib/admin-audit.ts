import { createAdminClient } from "@/lib/supabase/admin"

export async function logAdminAccess(params: {
  adminId: string
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, unknown>
  ip?: string
  userAgent?: string
}) {
  try {
    const admin = createAdminClient()
    await admin.from("audit_logs").insert({
      actor_id: params.adminId,
      action: params.action,
      target_type: params.resource,
      target_id: params.resourceId,
      details: {
        ...params.details,
        ip_address: params.ip,
        user_agent: params.userAgent,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Admin audit log failed:", error)
  }
}

export function getAdminAuditMetadata(request: Request) {
  return {
    ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
    userAgent: request.headers.get("user-agent") || "unknown",
  }
}
