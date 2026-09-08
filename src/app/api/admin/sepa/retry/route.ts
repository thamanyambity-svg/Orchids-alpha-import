import { NextResponse } from "next/server"
import { z } from "zod"
import { requireRole, handleApiError, ApiError } from "@/lib/auth-guard"
import { initiateRetryForFailedSEPA } from "@/lib/payments/sepa-admin.utils"

const schema = z.object({
  transactionId: z.string().uuid(),
})

/**
 * Relance manuelle d'un prélèvement SEPA en échec.
 *
 * Le contrôle d'accès était réécrit ici à la main : lecture de la session,
 * lecture du profil, comparaison du rôle. Le même contrôle existe dans
 * lib/auth-guard, et deux implémentations d'une même règle finissent toujours
 * par diverger — l'une reçoit un correctif que l'autre ignore. On passe donc
 * par le garde partagé, qui est aussi le seul endroit testé.
 *
 * transactionId n'était pas validé non plus : n'importe quelle chaîne partait
 * vers le service, qui relance un mouvement d'argent.
 */
export async function POST(req: Request) {
  try {
    const { user } = await requireRole(["ADMIN"])

    const parsed = schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      throw new ApiError(400, "transactionId doit être un UUID")
    }

    const result = await initiateRetryForFailedSEPA(parsed.data.transactionId, user.id)
    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
