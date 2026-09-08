import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

const requireRole = vi.fn()
const logAudit = vi.fn()
const adminInsert = vi.fn(() => Promise.resolve({ error: null }))

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireRole: (...args: any[]) => requireRole(...args) }
})
vi.mock("@/lib/audit", () => ({ logAudit: (...args: any[]) => logAudit(...args) }))
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ insert: adminInsert }) }),
}))

const { PATCH } = await import("./route")

const FILE = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"
const params = Promise.resolve({ id: FILE })

function setup({
  status = "IN_CUSTOMS",
  role = "ADMIN",
  declarations = [] as any[],
  updated = { id: FILE, status: "LIQUIDATED", updated_at: "2026-08-21T10:00:00.000Z" },
}: { status?: string; role?: string; declarations?: any[]; updated?: any } = {}) {
  const mock = createSupabaseMock((op) => {
    if (op.table === "customs_files" && op.type === "select") return { data: { id: FILE, status, order_id: "order-1" } }
    if (op.table === "customs_files" && op.type === "update") return { data: updated }
    if (op.table === "customs_declarations") return { data: declarations }
    return { data: null }
  })
  requireRole.mockResolvedValue({ user: { id: "actor-1" }, role, supabase: mock.client })
  return mock
}

function req(body: unknown) {
  return makeRequest(body, { headers: { "x-forwarded-for": "203.0.113.9" } })
}

describe("PATCH /api/customs/files/[id]/status", () => {
  beforeEach(() => vi.clearAllMocks())

  it("fait avancer le dossier et journalise la transition", async () => {
    const mock = setup()

    const res = await PATCH(req({ status: "LIQUIDATED" }), { params })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ previous_status: "IN_CUSTOMS", status: "LIQUIDATED" })
    expect(mock.lastOp("customs_files", "update")?.payload).toMatchObject({ status: "LIQUIDATED" })
    expect(adminInsert).toHaveBeenCalledWith(
      expect.objectContaining({ status_from: "IN_CUSTOMS", status_to: "LIQUIDATED", changed_by: "actor-1" })
    )
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "CUSTOMS_STATUS_CHANGED" }))
  })

  it("refuse une transition interdite au rôle", async () => {
    const mock = setup({ status: "IN_CUSTOMS", role: "PARTNER" })

    const res = await PATCH(req({ status: "BLOCKED", reason: "Conteneur retenu par la brigade" }), { params })

    expect(res.status).toBe(403)
    expect(mock.lastOp("customs_files", "update")).toBeUndefined()
  })

  it("exige un motif circonstancié pour bloquer", async () => {
    const mock = setup()

    const res = await PATCH(req({ status: "BLOCKED", reason: "bloqué" }), { params })

    expect(res.status).toBe(400)
    expect(mock.lastOp("customs_files", "update")).toBeUndefined()
  })

  it("refuse le paiement des droits tant que le fiscal n'a pas validé", async () => {
    setup({ status: "LIQUIDATED", declarations: [{ id: "d1", is_fiscal_validated: false }] })

    const res = await PATCH(req({ status: "PAID" }), { params })

    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toMatchObject({ error: expect.stringContaining("Conformité fiscale") })
  })

  it("refuse la libération tant que le comptable n'a pas validé", async () => {
    setup({ status: "PAID", declarations: [{ id: "d1", is_accounting_validated: false }] })

    const res = await PATCH(req({ status: "RELEASED" }), { params })

    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toMatchObject({ error: expect.stringContaining("Conformité comptable") })
  })

  it("libère le dossier quand toutes les déclarations sont validées", async () => {
    setup({
      status: "PAID",
      declarations: [{ id: "d1", is_accounting_validated: true }],
      updated: { id: FILE, status: "RELEASED", updated_at: "2026-08-21T10:00:00.000Z" },
    })

    const res = await PATCH(req({ status: "RELEASED" }), { params })

    expect(res.status).toBe(200)
  })

  it("signale un dossier dont le statut a changé entre-temps", async () => {
    setup({ updated: null })

    const res = await PATCH(req({ status: "LIQUIDATED" }), { params })

    expect(res.status).toBe(409)
    expect(adminInsert).not.toHaveBeenCalled()
  })

  it("rejette un statut inconnu", async () => {
    const mock = setup()

    const res = await PATCH(req({ status: "SHIPPED" }), { params })

    expect(res.status).toBe(400)
    expect(mock.lastOp("customs_files", "update")).toBeUndefined()
  })
})
