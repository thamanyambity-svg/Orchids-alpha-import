import { NextResponse } from "next/server"
import { z } from "zod"
import { requireUser, handleApiError, ApiError } from "@/lib/auth-guard"
import { processAutomaticDebit } from "@/lib/payments/auto-debit.service"

const schema = z.object({
  orderId: z.string().uuid(),
  paymentType: z.enum(["DEPOSIT_60", "BALANCE_40"]),
})

/**
 * Déclenche le prélèvement SEPA d'une commande.
 *
 * Cette route ne vérifiait que la présence d'une session. Elle passait ensuite
 * l'orderId reçu directement à processAutomaticDebit, qui lit la commande avec
 * la clé de service — donc hors RLS, par identifiant seul — et débite le moyen
 * de paiement enregistré de son acheteur.
 *
 * N'importe quel compte authentifié pouvait donc, en énumérant des identifiants
 * de commande, déclencher un prélèvement réel sur le compte bancaire d'un autre
 * acheteur. C'est un mouvement d'argent, pas une fuite de données.
 *
 * La propriété est désormais vérifiée avant tout appel au service, via le
 * client SSR soumis au RLS : si l'appelant ne voit pas la commande, il ne peut
 * pas la débiter. Un administrateur reste autorisé, pour les relances manuelles.
 */
export async function POST(req: Request) {
  try {
    const { supabase, user, role } = await requireUser()

    const parsed = schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      throw new ApiError(400, "Paramètres manquants ou invalides")
    }
    const { orderId, paymentType } = parsed.data

    // Lecture sous RLS : la commande n'est visible que si l'appelant y a droit.
    const { data: commande, error } = await supabase
      .from("orders")
      .select("id, request:import_requests(buyer_id)")
      .eq("id", orderId)
      .maybeSingle()

    if (error || !commande) {
      // On ne distingue pas « inexistante » de « pas la vôtre » : sinon la
      // réponse elle-même devient un moyen d'énumérer les commandes.
      throw new ApiError(404, "Commande introuvable")
    }

    const demande = Array.isArray(commande.request) ? commande.request[0] : commande.request
    const acheteurId = (demande as { buyer_id?: string } | null)?.buyer_id

    if (role !== "ADMIN" && acheteurId !== user.id) {
      throw new ApiError(403, "Cette commande ne vous appartient pas")
    }

    const pct = paymentType === "DEPOSIT_60" ? (0.6 as const) : (0.4 as const)
    const result = await processAutomaticDebit(orderId, pct)

    return NextResponse.json({
      success: result.status === "succeeded",
      paymentIntentId: result.paymentIntentId,
      status: result.status,
      amount: result.amount,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
