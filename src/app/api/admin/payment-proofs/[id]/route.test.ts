import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

const requireRole = vi.fn()
const logAudit = vi.fn()

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireRole: (...args: any[]) => requireRole(...args) }
})
vi.mock("@/lib/audit", () => ({ logAudit: (...args: any[]) => logAudit(...args) }))

const { PATCH } = await import("./route")

const PROOF = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const ORDER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const BUYER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const params = Promise.resolve({ id: PROOF })

function setup(proofRow: any = { id: PROOF, status: "PENDING_REVIEW", order_id: ORDER, uploaded_by: BUYER, user_id: BUYER }) {
  const mock = createSupabaseMock((op) => {
    if (op.table === "payment_proofs" && op.type === "select") return { data: proofRow }
    if (op.table === "payment_proofs" && op.type === "update") return { data: proofRow ? { id: PROOF } : null }
    return { data: null }
  })
  requireRole.mockResolvedValue({ user: { id: "admin-1" }, role: "ADMIN", supabase: mock.client })
  return mock
}

describe("PATCH /api/admin/payment-proofs/[id]", () => {
  beforeEach(() => vi.clearAllMocks())

  it("valide un justificatif et notifie le déposant", async () => {
    const mock = setup()

    const res = await PATCH(makeRequest({ decision: "ACCEPT" }), { params })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ status: "ACCEPTED" })

    const update = mock.lastOp("payment_proofs", "update")
    expect(update?.payload).toMatchObject({ status: "ACCEPTED", reviewed_by: "admin-1", rejected_reason: null })

    const notification = mock.lastOp("notifications", "insert")
    expect(notification?.payload).toMatchObject({ user_id: BUYER, channel: "payment", type: "success" })

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "PAYMENT_PROOF_ACCEPTED", targetId: PROOF })
    )
  })

  it("refuse un justificatif avec le motif transmis à l'acheteur", async () => {
    const mock = setup()

    const res = await PATCH(
      makeRequest({ decision: "REJECT", rejected_reason: "Montant viré inférieur à l'acompte dû" }),
      { params }
    )

    expect(res.status).toBe(200)
    expect(mock.lastOp("payment_proofs", "update")?.payload).toMatchObject({
      status: "REJECTED",
      rejected_reason: "Montant viré inférieur à l'acompte dû",
    })
    expect(mock.lastOp("notifications", "insert")?.payload.message).toContain("Montant viré inférieur")
  })

  it("rejette un motif de refus trop court", async () => {
    const mock = setup()

    const res = await PATCH(makeRequest({ decision: "REJECT", rejected_reason: "flou" }), { params })

    expect(res.status).toBe(400)
    expect(mock.lastOp("payment_proofs", "update")).toBeUndefined()
  })

  it("renvoie 404 quand le justificatif n'existe pas", async () => {
    setup(null)

    const res = await PATCH(makeRequest({ decision: "ACCEPT" }), { params })

    expect(res.status).toBe(404)
  })

  it("renvoie 409 quand le justificatif a déjà été tranché", async () => {
    const mock = setup({ id: PROOF, status: "ACCEPTED", order_id: ORDER, uploaded_by: BUYER, user_id: BUYER })

    const res = await PATCH(makeRequest({ decision: "ACCEPT" }), { params })

    expect(res.status).toBe(409)
    expect(mock.lastOp("payment_proofs", "update")).toBeUndefined()
    expect(logAudit).not.toHaveBeenCalled()
  })
})
