import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

const requireUser = vi.fn()

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireUser: (...args: any[]) => requireUser(...args) }
})
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }))

const { POST } = await import("./route")

const PO_ID = "33333333-3333-4333-8333-333333333333"

let userCounter = 0
const nextUserId = () => `buyer-${++userCounter}`

function setup({
  buyerId,
  status = "GENERATED",
  cgvAcceptedAt = null,
}: {
  buyerId: string
  status?: string
  cgvAcceptedAt?: string | null
}) {
  const mock = createSupabaseMock((op) => {
    if (op.table === "purchase_orders" && op.type === "select") {
      return { data: { id: PO_ID, status, cgv_accepted_at: cgvAcceptedAt, buyer_id: buyerId } }
    }
    if (op.table === "purchase_orders" && op.type === "update") {
      return { data: { id: PO_ID, ...op.payload } }
    }
    return { data: null }
  })
  return mock
}

const params = Promise.resolve({ id: PO_ID })
const body = { cgv_accepted: true as const, cgv_version: "1.0" }

describe("POST /api/purchase-orders/[id]/accept-cgv", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Régression : le buyer était lu via l'embed `request:import_requests(buyer_id)`,
  // alors que purchase_orders porte déjà la colonne buyer_id.
  it("laisse l'acheteur accepter les CGV et passe le PO en PENDING_SIGNATURE", async () => {
    const userId = nextUserId()
    const mock = setup({ buyerId: userId })
    requireUser.mockResolvedValue({ user: { id: userId }, role: "BUYER", supabase: mock.client })

    const res = await POST(
      makeRequest(body, { headers: { "x-forwarded-for": "203.0.113.7", "user-agent": "vitest" } }),
      { params }
    )

    expect(res.status).toBe(200)
    const update = mock.lastOp("purchase_orders", "update")?.payload
    expect(update.status).toBe("PENDING_SIGNATURE")
    expect(update.cgv_accepted_at).toBeTruthy()
    expect(update.cgv_accepted_ip).toBe("203.0.113.7")
    expect(update.cgv_accepted_user_agent).toBe("vitest")
  })

  it("refuse un utilisateur qui n'est pas l'acheteur", async () => {
    const mock = setup({ buyerId: "un-autre-acheteur" })
    requireUser.mockResolvedValue({ user: { id: nextUserId() }, role: "BUYER", supabase: mock.client })

    const res = await POST(makeRequest(body), { params })

    expect(res.status).toBe(403)
  })

  it("refuse une double acceptation", async () => {
    const userId = nextUserId()
    const mock = setup({ buyerId: userId, cgvAcceptedAt: "2026-07-01T00:00:00.000Z" })
    requireUser.mockResolvedValue({ user: { id: userId }, role: "BUYER", supabase: mock.client })

    const res = await POST(makeRequest(body), { params })

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: "CGV already accepted" })
  })

  it("refuse un PO dans un état non signable", async () => {
    const userId = nextUserId()
    const mock = setup({ buyerId: userId, status: "CANCELLED" })
    requireUser.mockResolvedValue({ user: { id: userId }, role: "BUYER", supabase: mock.client })

    const res = await POST(makeRequest(body), { params })

    expect(res.status).toBe(400)
  })

  it("refuse un payload sans acceptation explicite des CGV", async () => {
    const userId = nextUserId()
    const mock = setup({ buyerId: userId })
    requireUser.mockResolvedValue({ user: { id: userId }, role: "BUYER", supabase: mock.client })

    const res = await POST(makeRequest({ cgv_accepted: false }), { params })

    expect(res.status).toBe(400)
  })
})
