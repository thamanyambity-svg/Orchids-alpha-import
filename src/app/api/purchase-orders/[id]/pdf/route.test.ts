import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

/** PDF du bon de commande : réservé au client du dossier, au partenaire affecté et à l'administration. */

const requireUser = vi.fn()
const generer = vi.fn(async (..._a: unknown[]) => Buffer.from("%PDF-1.4 test"))
let db: ReturnType<typeof createSupabaseMock>

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireUser: (...a: any[]) => requireUser(...a) }
})
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => db.client }))
vi.mock("@/components/orders/purchase-order-pdf", () => ({ genererBonDeCommandePdf: (...a: unknown[]) => generer(...a) }))

const { GET } = await import("./route")

const BC = "77777777-7777-4777-8777-777777777777"
const DEMANDE = "11111111-1111-4111-8111-111111111111"
const ACHETEUR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const PARTENAIRE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const FICHE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const INTRUS = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"

const ctx = (id = BC) => ({ params: Promise.resolve({ id }) })

function setup({ compte = ACHETEUR, role = "BUYER", signe = true } = {}) {
  db = createSupabaseMock((op) => {
    if (op.table === "purchase_orders") {
      return {
        data: {
          id: BC, request_id: DEMANDE, quote_id: "q1", partner_id: FICHE, po_number: "PO-20260922-7561",
          status: signe ? "SIGNED" : "GENERATED", currency: "USD", grand_total_usd: 41950,
          deposit_percent: 60, balance_percent: 40, created_at: "2026-09-22T11:29:00Z",
          cgv_accepted_at: signe ? "2026-09-25T09:00:00Z" : null, cgv_version: "1.0", cgv_accepted_ip: "41.243.1.2",
        },
      }
    }
    if (op.table === "import_requests") {
      return { data: { buyer_id: ACHETEUR, assigned_partner_id: FICHE, reference: "AIX-20260911-2496", product_name: "Volvo FMX 2022", buyer: { full_name: "Client", company_name: "SOCOMA", city: "Kinshasa" } } }
    }
    if (op.table === "quotes") return { data: { version: 2, unit_price_usd: 18500, quantity: 2, subtotal_usd: 37000, incoterm: "CIF" } }
    if (op.table === "partner_profiles") return { data: { user_id: PARTENAIRE, user: { company_name: "MAARMALA SARL" }, country: { name: "Émirats" } } }
    return { data: null }
  })
  requireUser.mockResolvedValue({ user: { id: compte }, role, supabase: {} })
}

describe("GET /api/purchase-orders/[id]/pdf", () => {
  beforeEach(() => vi.clearAllMocks())

  it("sert le document au client du dossier, avec la référence de la pro forma", async () => {
    setup()
    const res = await GET(makeRequest(null), ctx())

    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toBe("application/pdf")
    expect(res.headers.get("content-disposition")).toContain("bon-de-commande-PO-20260922-7561.pdf")
    expect(generer).toHaveBeenCalledWith(
      expect.objectContaining({ numero: "PO-20260922-7561", pro_forma: "AIX-20260911-2496-PF02", total: 41950 })
    )
  })

  it("porte la trace de l'acceptation des conditions générales", async () => {
    setup()
    await GET(makeRequest(null), ctx())
    expect(generer).toHaveBeenCalledWith(
      expect.objectContaining({ signature: { le: "2026-09-25T09:00:00Z", version: "1.0", adresse: "41.243.1.2" } })
    )
  })

  it("n'annonce aucune signature tant que le client n'a pas validé", async () => {
    setup({ signe: false })
    await GET(makeRequest(null), ctx())
    expect(generer).toHaveBeenCalledWith(expect.objectContaining({ signature: null, statut: "GENERATED" }))
  })

  it("sert le document au partenaire affecté et à l'administration", async () => {
    setup({ compte: PARTENAIRE, role: "PARTNER" })
    expect((await GET(makeRequest(null), ctx())).status).toBe(200)
    setup({ compte: "admin-1", role: "ADMIN" })
    expect((await GET(makeRequest(null), ctx())).status).toBe(200)
  })

  it("répond 404 à un compte étranger au dossier", async () => {
    setup({ compte: INTRUS, role: "BUYER" })
    expect((await GET(makeRequest(null), ctx())).status).toBe(404)
    expect(generer).not.toHaveBeenCalled()
  })

  it("refuse un identifiant mal formé sans rien lire", async () => {
    setup()
    expect((await GET(makeRequest(null), ctx("abc"))).status).toBe(400)
    expect(db.ops.length).toBe(0)
  })
})
