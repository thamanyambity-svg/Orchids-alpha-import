import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

const requireRole = vi.fn()

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireRole: (...args: any[]) => requireRole(...args) }
})
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }))
vi.mock("@/lib/webhooks", () => ({ sendToN8N: vi.fn() }))

const { POST } = await import("./route")

const PARTNER_PROFILE_ID = "11111111-1111-4111-8111-111111111111"
const REQUEST_ID = "22222222-2222-4222-8222-222222222222"

const validPayload = {
  request_id: REQUEST_ID,
  unit_price_usd: 100,
  quantity: 10,
  freight_cost_usd: 50,
  insurance_cost_usd: 25,
  validity_days: 30,
}

/** Un id utilisateur unique par test : le rate-limit est indexé sur user.id. */
let userCounter = 0
const nextUserId = () => `user-${++userCounter}`

function setup({
  role,
  assignedPartnerId = PARTNER_PROFILE_ID,
  partnerProfile = { id: PARTNER_PROFILE_ID },
  requestStatus = "PENDING",
}: {
  role: "ADMIN" | "PARTNER"
  assignedPartnerId?: string | null
  partnerProfile?: { id: string } | null
  requestStatus?: string
}) {
  const mock = createSupabaseMock((op) => {
    if (op.table === "import_requests" && op.type === "select") {
      return {
        data: {
          id: REQUEST_ID,
          status: requestStatus,
          assigned_partner_id: assignedPartnerId,
          category: "ELECTRONICS",
        },
      }
    }
    if (op.table === "profiles") return { data: { role } }
    if (op.table === "partner_profiles") return { data: partnerProfile }
    if (op.table === "quotes" && op.type === "select") return { data: [] }
    if (op.table === "quotes" && op.type === "insert") {
      return { data: { id: "quote-1", grand_total_usd: "1075.00", partner_id: op.payload.partner_id } }
    }
    return { data: null }
  })

  requireRole.mockResolvedValue({
    user: { id: nextUserId(), email: "u@example.com" },
    role,
    supabase: mock.client,
  })

  return mock
}

describe("POST /api/quotes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("accepte le devis d'un partenaire assigné", async () => {
    const mock = setup({ role: "PARTNER" })

    const res = await POST(makeRequest(validPayload))

    expect(res.status).toBe(200)
    expect(mock.lastOp("quotes", "insert")?.payload.partner_id).toBe(PARTNER_PROFILE_ID)
  })

  // Régression : `partner` était déclaré dans le bloc `if (!isAdmin)` puis lu à
  // l'insertion → ReferenceError, donc 500 systématique sur toute soumission.
  it("accepte le devis d'un admin et retombe sur le partenaire assigné", async () => {
    const mock = setup({ role: "ADMIN", partnerProfile: null })

    const res = await POST(makeRequest(validPayload))

    expect(res.status).toBe(200)
    expect(mock.lastOp("quotes", "insert")?.payload.partner_id).toBe(PARTNER_PROFILE_ID)
  })

  // Régression : subtotal_usd / total_fees_usd / grand_total_usd sont GENERATED ALWAYS,
  // Postgres rejette toute valeur explicite (erreur 428C9).
  it("n'insère jamais les colonnes calculées par la base", async () => {
    const mock = setup({ role: "PARTNER" })

    await POST(makeRequest(validPayload))

    const payload = mock.lastOp("quotes", "insert")?.payload
    expect(payload).not.toHaveProperty("subtotal_usd")
    expect(payload).not.toHaveProperty("total_fees_usd")
    expect(payload).not.toHaveProperty("grand_total_usd")
  })

  // Régression : valid_until n'était jamais renseigné (ni trigger ni application),
  // donc le contrôle d'expiration dans /api/quotes/accept était mort.
  it("calcule valid_until à partir de validity_days", async () => {
    const mock = setup({ role: "PARTNER" })

    await POST(makeRequest({ ...validPayload, validity_days: 10 }))

    const validUntil = mock.lastOp("quotes", "insert")?.payload.valid_until
    expect(validUntil).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const expected = new Date()
    expected.setDate(expected.getDate() + 10)
    expect(validUntil).toBe(expected.toISOString().slice(0, 10))
  })

  it("refuse un partenaire non assigné à la demande", async () => {
    setup({ role: "PARTNER", partnerProfile: { id: "un-autre-partenaire" } })

    const res = await POST(makeRequest(validPayload))

    expect(res.status).toBe(403)
  })

  it("refuse un admin si aucun partenaire n'est assigné", async () => {
    setup({ role: "ADMIN", partnerProfile: null, assignedPartnerId: null })

    const res = await POST(makeRequest(validPayload))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: expect.stringContaining("No partner") })
  })

  it("rejette un payload invalide", async () => {
    setup({ role: "PARTNER" })

    const res = await POST(makeRequest({ request_id: "pas-un-uuid", unit_price_usd: -1 }))

    expect(res.status).toBe(400)
  })
})
