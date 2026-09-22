import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

/** Accès au PDF de la facture finale : administration, et client une fois émise. Jamais le partenaire. */

const requireUser = vi.fn()
const generer = vi.fn(async (..._a: unknown[]) => Buffer.from("%PDF-1.4 test"))
let db: ReturnType<typeof createSupabaseMock>

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireUser: (...a: any[]) => requireUser(...a) }
})
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => db.client }))
vi.mock("@/components/invoices/final-invoice-pdf", () => ({ genererFactureFinalePdf: (...a: unknown[]) => generer(...a) }))

const { GET } = await import("./route")

const FACTURE = "12121212-1212-4212-8212-121212121212"
const ACHETEUR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const PARTENAIRE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const ctx = () => ({ params: Promise.resolve({ id: FACTURE }) })

function setup({ compte = ACHETEUR, role = "BUYER", statut = "SENT" } = {}) {
  db = createSupabaseMock((op) => {
    if (op.table === "invoices") return { data: { id: FACTURE, type: "FINAL", status: statut, request_id: "d1", purchase_order_id: "po-1", number: "FAC-PO-2026-0001", lines: [] } }
    if (op.table === "import_requests") return { data: { buyer_id: ACHETEUR, assigned_partner_id: "fiche-1", reference: "AIX-1" } }
    if (op.table === "partner_profiles") return { data: { user_id: PARTENAIRE } }
    if (op.table === "purchase_orders") return { data: { po_number: "PO-2026-0001", deposit_percent: 60 } }
    return { data: null }
  })
  requireUser.mockResolvedValue({ user: { id: compte }, role, supabase: {} })
}

describe("GET /api/invoices/[id]/pdf", () => {
  beforeEach(() => vi.clearAllMocks())

  it("sert la facture émise au client", async () => {
    setup()
    const res = await GET(makeRequest(null), ctx())
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toBe("application/pdf")
    expect(res.headers.get("content-disposition")).toContain("facture-FAC-PO-2026-0001.pdf")
  })

  it("refuse au client un brouillon", async () => {
    setup({ statut: "DRAFT" })
    expect((await GET(makeRequest(null), ctx())).status).toBe(404)
    expect(generer).not.toHaveBeenCalled()
  })

  it("refuse au partenaire, même affecté", async () => {
    setup({ compte: PARTENAIRE, role: "PARTNER" })
    expect((await GET(makeRequest(null), ctx())).status).toBe(404)
    expect(generer).not.toHaveBeenCalled()
  })

  it("sert le brouillon à l'administration", async () => {
    setup({ compte: "admin-1", role: "ADMIN", statut: "DRAFT" })
    expect((await GET(makeRequest(null), ctx())).status).toBe(200)
  })
})
