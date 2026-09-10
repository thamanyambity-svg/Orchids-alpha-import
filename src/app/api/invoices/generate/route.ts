import { NextResponse } from "next/server"
import { supabaseAdmin as supabase } from "@/lib/supabase/admin"
import { generateInvoice } from "@/components/invoices/generate-invoice"
import { requireRole, handleApiError, ApiError } from "@/lib/auth-guard"

/** Les trois seuls types de facture acceptés, alignés sur l'enum invoice_type. */
const TYPES_AUTORISES = ["PROFORMA", "COMMERCIAL", "FINAL"] as const
type TypeFacture = (typeof TYPES_AUTORISES)[number]

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Génère une facture PDF pour une commande.
 *
 * Cette route était ouverte à tous : sans authentification, avec le client
 * service_role, elle acceptait n'importe quel orderId et renvoyait le nom,
 * l'adresse électronique, la société et l'adresse de l'acheteur. Elle
 * téléversait en plus un PDF dans le bucket « invoices » et insérait une
 * ligne dans la table invoices — donc une écriture non authentifiée, pas
 * seulement une fuite.
 *
 * L'émission d'une facture est un acte d'administration : elle est désormais
 * réservée au rôle ADMIN. Le client service_role est conservé APRÈS ce
 * contrôle, parce que le téléversement dans le bucket et l'écriture de la
 * facture sont des opérations système, conformément à la stratégie décrite
 * dans lib/auth-guard.
 */
export async function POST(req: Request) {
  try {
    await requireRole(["ADMIN"])

    const corps = await req.json().catch(() => null)
    if (!corps || typeof corps !== "object") {
      throw new ApiError(400, "Corps de requête invalide")
    }

    const { orderId, type } = corps as { orderId?: unknown; type?: unknown }

    if (typeof orderId !== "string" || !UUID.test(orderId)) {
      throw new ApiError(400, "orderId doit être un UUID")
    }
    if (typeof type !== "string" || !TYPES_AUTORISES.includes(type as TypeFacture)) {
      throw new ApiError(400, `type doit valoir ${TYPES_AUTORISES.join(", ")}`)
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        import_requests!inner(*, buyer_id, profiles!buyer_id(full_name, email, company_name, city, country_id, countries!country_id(name)))
      `)
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const requestData = order.import_requests
    const buyerProfile = requestData.profiles
    const buyerCountry = buyerProfile.countries?.name || "RDC"

    const invoiceNumber = `INV-${type === "PROFORMA" ? "PRO" : type === "COMMERCIAL" ? "COM" : "FIN"}-${new Date().getFullYear()}-${orderId.slice(0, 8).toUpperCase()}`

    const invoiceData = {
      number: invoiceNumber,
      type,
      issuedAt: new Date().toLocaleDateString("fr-FR"),
      dueAt: type === "PROFORMA" ? null : new Date(Date.now() + 30 * 86400000).toLocaleDateString("fr-FR"),
      buyerName: buyerProfile.full_name || "N/A",
      buyerCompany: buyerProfile.company_name || "N/A",
      buyerEmail: buyerProfile.email || "N/A",
      buyerAddress: `${buyerProfile.city || "Kinshasa"}, ${buyerCountry}`,
      partnerName: "Partenaire Alpha Import",
      partnerCompany: "À déterminer",
      productName: "Marchandises importées",
      productDescription: `Importation via Alpha Import Exchange — Réf: ${requestData.reference}`,
      quantity: requestData.quantity || 1,
      unit: requestData.unit || "unité",
      unitPrice: order.total_amount / (requestData.quantity || 1),
      totalAmount: order.total_amount,
      depositAmount: order.deposit_amount,
      balanceAmount: order.balance_amount,
      alphaCommission: order.alpha_commission,
      notes: `Facture ${type === "PROFORMA" ? "proforma" : type === "COMMERCIAL" ? "commerciale" : "finale"} générée automatiquement. Paiement par virement bancaire ou Stripe.`,
    }

    const pdfBuffer = await generateInvoice(invoiceData)

    // Rangé par commande dans un espace privé : la route d'accès autorise
    // l'acheteur de la commande en lisant l'identifiant dans le chemin. La
    // facture porte le nom et l'adresse de l'acheteur ; elle était exposée par
    // lien public.
    const fileName = `${orderId}/${invoiceNumber}.pdf`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("invoices")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: "Failed to upload invoice" }, { status: 500 })
    }

    const fileUrl = `/api/files/invoices?path=${encodeURIComponent(fileName)}`

    const { data: invoice, error: dbError } = await supabase
      .from("invoices")
      .upsert({
        order_id: orderId,
        request_id: requestData.id,
        type,
        number: invoiceNumber,
        total_amount: order.total_amount,
        deposit_amount: order.deposit_amount,
        balance_amount: order.balance_amount,
        alpha_commission: order.alpha_commission,
        status: "DRAFT",
        issued_at: new Date().toISOString(),
        due_at: type !== "PROFORMA" ? new Date(Date.now() + 30 * 86400000).toISOString() : null,
        file_url: fileUrl,
        notes: invoiceData.notes,
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: "Failed to save invoice" }, { status: 500 })
    }

    return NextResponse.json({ invoice, url: fileUrl })
  } catch (error) {
    return handleApiError(error)
  }
}
