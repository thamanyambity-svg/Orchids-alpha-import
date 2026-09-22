import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

/** Accès au PDF d'une pro forma : jamais un brouillon pour le client, jamais un dossier étranger. */

const requireUser = vi.fn()
const generer = vi.fn(async (..._a: unknown[]) => Buffer.from("%PDF-1.4 test"))
let db: ReturnType<typeof createSupabaseMock>

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireUser: (...a: any[]) => requireUser(...a) }
})
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => db.client }))
vi.mock("@/components/quotes/proforma-pdf", () => ({ genererProFormaPdf: (...a: unknown[]) => generer(...a) }))

const { GET } = await import("./route")

const QUOTE = "99999999-9999-4999-8999-999999999999"
const DEMANDE = "11111111-1111-4111-8111-111111111111"
const ACHETEUR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const PARTENAIRE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const FICHE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const INTRUS = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"

const ctx = () => ({ params: Promise.resolve({ id: QUOTE }) })

function setup({ compte = ACHETEUR, role = "BUYER", soumise = "2026-09-20T10:00:00Z" as string | null } = {}) {
  db = createSupabaseMock((op) => {
    if (op.table === "quotes") return { data: { id: QUOTE, request_id: DEMANDE, partner_id: FICHE, version: 2, status: soumise ? "SUBMITTED" : "DRAFT", submitted_at: soumise } }
    if (op.table === "import_requests") {
      return { data: { buyer_id: ACHETEUR, assigned_partner_id: FICHE, reference: "AIX-20260911-2496", product_name: "Volvo FMX 2022", buyer: { full_name: "Client" } } }
    }
    if (op.table === "partner_profiles") return { data: { user_id: PARTENAIRE, user: { company_name: "MAARMALA SARL" }, country: { name: "Émirats" } } }
    return { data: null }
  })
  requireUser.mockResolvedValue({ user: { id: compte }, role, supabase: {} })
}

describe("GET /api/quotes/[id]/pdf", () => {
  beforeEach(() => vi.clearAllMocks())

  it("sert le PDF au client une fois la pro forma transmise", async () => {
    setup()
    const res = await GET(makeRequest(null), ctx())

    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toBe("application/pdf")
    expect(res.headers.get("cache-control")).toContain("no-store")
    expect(res.headers.get("content-disposition")).toContain("proforma-AIX-20260911-2496-v2.pdf")
    expect(generer).toHaveBeenCalledWith(expect.objectContaining({ reference: "AIX-20260911-2496", produit: "Volvo FMX 2022" }))
  })

  it("refuse au client un brouillon non transmis", async () => {
    setup({ soumise: null })
    expect((await GET(makeRequest(null), ctx())).status).toBe(404)
    expect(generer).not.toHaveBeenCalled()
  })

  it("sert le brouillon au partenaire affecté et à l'administration", async () => {
    setup({ compte: PARTENAIRE, role: "PARTNER", soumise: null })
    expect((await GET(makeRequest(null), ctx())).status).toBe(200)
    setup({ compte: "admin-1", role: "ADMIN", soumise: null })
    expect((await GET(makeRequest(null), ctx())).status).toBe(200)
  })

  it("répond 404 à un compte étranger au dossier", async () => {
    setup({ compte: INTRUS, role: "PARTNER" })
    expect((await GET(makeRequest(null), ctx())).status).toBe(404)
    expect(generer).not.toHaveBeenCalled()
  })
})
