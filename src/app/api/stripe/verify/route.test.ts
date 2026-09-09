import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock } from "@/test-utils/supabase-mock"

/**
 * Confirmation affichée au retour de Stripe.
 *
 * La route est en lecture seule par conception : la vérité financière —
 * transactions, drapeaux de paiement, transition d'état — vient exclusivement
 * du webhook Stripe, qui est signé. Une page de retour est déclenchée par le
 * navigateur du client : lui laisser écrire quoi que ce soit reviendrait à
 * accepter que l'acheteur déclare lui-même son paiement.
 *
 * Le second point est l'appartenance : l'identifiant de session Stripe voyage
 * dans l'URL, donc n'importe qui en possédant un ne doit pas pouvoir lire la
 * commande d'autrui.
 */

const requireUser = vi.fn()
const recupererSession = vi.fn((_id?: string) => Promise.resolve(SESSION))

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireUser: (...args: any[]) => requireUser(...args) }
})
vi.mock("@/lib/stripe", () => ({
  stripe: { checkout: { sessions: { retrieve: (id: string) => recupererSession(id) } } },
}))

const { GET } = await import("./route")
const { ApiError } = await import("@/lib/auth-guard")

const ACHETEUR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const COMMANDE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

const SESSION: any = {
  id: "cs_1",
  amount_total: 190860,
  payment_status: "paid",
  metadata: { orderId: COMMANDE, paymentType: "DEPOSIT_60", orderReference: "CMD-2026-001" },
}

function setup({ visible = true } = {}) {
  const mock = createSupabaseMock((op) =>
    op.table === "orders" && visible ? { data: { id: COMMANDE } } : { data: null }
  )
  requireUser.mockResolvedValue({ user: { id: ACHETEUR }, role: "BUYER", supabase: mock.client })
  return mock
}

function requete(query: string) {
  return { nextUrl: new URL(`https://site.test/api/stripe/verify${query}`) } as any
}

describe("GET /api/stripe/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
    recupererSession.mockResolvedValue(SESSION)
  })

  it("exige une session utilisateur", async () => {
    requireUser.mockRejectedValue(new ApiError(401, "Unauthorized"))

    const res = await GET(requete("?session_id=cs_1"))

    expect(res.status).toBe(401)
    expect(recupererSession).not.toHaveBeenCalled()
  })

  it("refuse d'interroger Stripe sans identifiant de session", async () => {
    setup()

    const res = await GET(requete(""))

    expect(res.status).toBe(400)
    expect(recupererSession).not.toHaveBeenCalled()
  })

  it("refuse de montrer la commande d'un autre acheteur", async () => {
    // L'identifiant de session voyage dans l'URL : le connaître ne suffit pas.
    setup({ visible: false })

    const res = await GET(requete("?session_id=cs_1"))

    expect(res.status).toBe(403)
  })

  it("refuse une session Stripe sans métadonnées exploitables", async () => {
    setup()
    recupererSession.mockResolvedValue({ ...SESSION, metadata: {} })

    const res = await GET(requete("?session_id=cs_1"))

    expect(res.status).toBe(400)
  })

  it("refuse une session dont le type de paiement manque", async () => {
    setup()
    recupererSession.mockResolvedValue({
      ...SESSION,
      metadata: { orderId: COMMANDE, orderReference: "CMD-2026-001" },
    })

    const res = await GET(requete("?session_id=cs_1"))

    expect(res.status).toBe(400)
  })

  it("restitue le statut réel de Stripe sans le réinterpréter", async () => {
    setup()
    recupererSession.mockResolvedValue({ ...SESSION, payment_status: "unpaid" })

    const res = await GET(requete("?session_id=cs_1"))

    // Un « unpaid » affiché comme payé serait un mensonge à l'acheteur.
    await expect(res.json()).resolves.toMatchObject({ status: "unpaid" })
  })

  it("renvoie la référence, le type et le montant", async () => {
    setup()

    const res = await GET(requete("?session_id=cs_1"))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      orderReference: "CMD-2026-001",
      paymentType: "DEPOSIT_60",
      amount: 190860,
      status: "paid",
    })
  })

  it("n'écrit jamais en base — la vérité financière vient du webhook", async () => {
    const mock = setup()

    await GET(requete("?session_id=cs_1"))

    expect(mock.lastOp("orders", "update")).toBeUndefined()
    expect(mock.lastOp("orders", "insert")).toBeUndefined()
    expect(mock.ops.some((o) => o.type !== "select")).toBe(false)
  })

  it("ne divulgue pas l'erreur interne quand Stripe échoue", async () => {
    setup()
    recupererSession.mockRejectedValue(new Error("No such checkout.session: cs_inconnue"))

    const res = await GET(requete("?session_id=cs_inconnue"))

    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({ error: "Internal Server Error" })
  })
})
