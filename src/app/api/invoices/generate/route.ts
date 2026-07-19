import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generateInvoice } from "@/components/invoices/generate-invoice"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { orderId, type } = await req.json()

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

    const fileName = `${invoiceNumber}.pdf`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("invoices")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: "Failed to upload invoice" }, { status: 500 })
    }

    const { data: publicUrl } = supabase.storage.from("invoices").getPublicUrl(fileName)

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
        file_url: publicUrl.publicUrl,
        notes: invoiceData.notes,
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: "Failed to save invoice" }, { status: 500 })
    }

    return NextResponse.json({ invoice, url: publicUrl.publicUrl })
  } catch (error) {
    console.error("Invoice generation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
