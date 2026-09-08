import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

const requireRole = vi.fn()
const logAudit = vi.fn()

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireRole: (...args: any[]) => requireRole(...args) }
})
vi.mock("@/lib/audit", () => ({ logAudit: (...args: any[]) => logAudit(...args) }))

const { GET, POST } = await import("./route")

const ADMIN = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"

function setup(rows: any = { id: "rate-1", from_currency: "USD", to_currency: "CNY", rate: 7.24 }) {
  const mock = createSupabaseMock((op) => (op.table === "exchange_rates" ? { data: rows } : { data: null }))
  requireRole.mockResolvedValue({ user: { id: ADMIN }, role: "ADMIN", supabase: mock.client })
  return mock
}

describe("POST /api/admin/exchange-rates", () => {
  beforeEach(() => vi.clearAllMocks())

  it("publie un taux sur la base USD et journalise", async () => {
    const mock = setup()

    const res = await POST(makeRequest({ to_currency: "cny", rate: 7.24, notes: "Relevé BCE" }))

    expect(res.status).toBe(201)
    const insert = mock.lastOp("exchange_rates", "insert")
    expect(insert?.payload).toMatchObject({
      from_currency: "USD",
      to_currency: "CNY",
      rate: 7.24,
      set_by: ADMIN,
      created_by: ADMIN,
      status: "ACTIVE",
    })
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "EXCHANGE_RATE_PUBLISHED", details: { pair: "USD/CNY", rate: 7.24 } })
    )
  })

  it("refuse USD comme devise cible", async () => {
    const mock = setup()

    const res = await POST(makeRequest({ to_currency: "USD", rate: 1 }))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: expect.stringContaining("ne peut pas être USD") })
    expect(mock.lastOp("exchange_rates", "insert")).toBeUndefined()
  })

  it("refuse un taux nul ou négatif", async () => {
    const mock = setup()

    expect((await POST(makeRequest({ to_currency: "CNY", rate: 0 }))).status).toBe(400)
    expect((await POST(makeRequest({ to_currency: "CNY", rate: -3 }))).status).toBe(400)
    expect(mock.lastOp("exchange_rates", "insert")).toBeUndefined()
  })
})

describe("GET /api/admin/exchange-rates", () => {
  beforeEach(() => vi.clearAllMocks())

  it("sépare les taux en vigueur de ceux qui ont été remplacés", async () => {
    setup([
      { id: "r1", to_currency: "CNY", rate: 7.24, superseded_at: null },
      { id: "r2", to_currency: "CNY", rate: 7.1, superseded_at: "2026-08-01T00:00:00.000Z" },
      { id: "r3", to_currency: "EUR", rate: 0.92, superseded_at: null },
    ])

    const body = await (await GET()).json()

    expect(body.rates).toHaveLength(3)
    expect(body.active.map((r: any) => r.id)).toEqual(["r1", "r3"])
  })
})
