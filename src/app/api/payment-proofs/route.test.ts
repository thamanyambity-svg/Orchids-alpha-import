import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

const requireUser = vi.fn()

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireUser: (...args: any[]) => requireUser(...args) }
})

const { POST } = await import("./route")

const ORDER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
let n = 0

function setup(result: { data?: any; error?: any } = { data: { id: "proof-1", status: "PENDING_REVIEW" } }) {
  const mock = createSupabaseMock((op) => (op.table === "payment_proofs" ? result : { data: null }))
  // Un identifiant distinct par test : la limitation de débit est en mémoire et
  // fuiterait d'un test à l'autre.
  requireUser.mockResolvedValue({ user: { id: `buyer-${++n}` }, role: "BUYER", supabase: mock.client })
  return mock
}

const validPayload = {
  order_id: ORDER,
  file_path: "payment-proofs/order/1.pdf",
  file_name_original: "virement.pdf",
  declared_amount: 645,
  declared_currency: "USD",
}

describe("POST /api/payment-proofs", () => {
  beforeEach(() => vi.clearAllMocks())

  it("enregistre le dépôt en attente de revue, au nom de l'utilisateur connecté", async () => {
    const mock = setup()

    const res = await POST(makeRequest(validPayload))

    expect(res.status).toBe(201)
    const insert = mock.lastOp("payment_proofs", "insert")
    expect(insert?.payload).toMatchObject({
      order_id: ORDER,
      status: "PENDING_REVIEW",
      declared_currency: "USD",
    })
    // L'identité vient de la session, jamais du corps de la requête.
    expect(insert?.payload.uploaded_by).toMatch(/^buyer-/)
    expect(insert?.payload.user_id).toBe(insert?.payload.uploaded_by)
  })

  it("traduit une violation de policy en 403", async () => {
    setup({ error: { code: "42501", message: "new row violates row-level security policy" } })
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})

    const res = await POST(makeRequest(validPayload))

    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toMatchObject({ error: "Cette commande ne vous appartient pas" })
    spy.mockRestore()
  })

  it("refuse un payload sans commande", async () => {
    const mock = setup()

    const res = await POST(makeRequest({ file_path: "payment-proofs/x.pdf" }))

    expect(res.status).toBe(400)
    expect(mock.lastOp("payment_proofs", "insert")).toBeUndefined()
  })

  it("refuse un identifiant de commande qui n'est pas un uuid", async () => {
    const mock = setup()

    const res = await POST(makeRequest({ ...validPayload, order_id: "42" }))

    expect(res.status).toBe(400)
    expect(mock.lastOp("payment_proofs", "insert")).toBeUndefined()
  })
})
