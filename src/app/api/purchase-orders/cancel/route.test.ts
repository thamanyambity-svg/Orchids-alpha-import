import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

/**
 * Annulation d'un bon de commande dans la fenêtre de 48 heures.
 *
 * C'est la contrepartie de la signature, et la promesse faite à l'acheteur sur
 * la page d'accueil. Elle repose entièrement sur une comparaison de dates : si
 * elle se referme trop tôt, l'acheteur perd un droit qu'on lui a vendu ; si
 * elle ne se referme jamais, un bon confirmé depuis des semaines redevient
 * annulable alors que la marchandise est déjà achetée.
 *
 * Le motif est obligatoire et long d'au moins dix caractères : c'est la seule
 * trace de la raison d'une annulation, et un « ok » ne renseigne personne.
 */

const requireUser = vi.fn()
const logAudit = vi.fn()

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireUser: (...args: any[]) => requireUser(...args) }
})
vi.mock("@/lib/rate-limit", () => ({
  // Le limiteur est une Map partagée entre les tests d'un même fichier : il
  // épuiserait le budget au bout de cinq cas. Il est éprouvé séparément, en
  // conditions réelles ; ici on teste la règle métier, pas le compteur.
  checkRateLimit: () => ({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 }),
}))
vi.mock("@/lib/audit", () => ({ logAudit: (...args: any[]) => logAudit(...args) }))

const { POST } = await import("./route")

const ACHETEUR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const AUTRE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const BON = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

const HEURE = 3_600_000
const MOTIF = "Le fournisseur ne peut plus tenir le délai annoncé."

function setup({
  buyerId = ACHETEUR,
  status = "SIGNED",
  cgvAcceptedAt = new Date(Date.now() - 2 * HEURE).toISOString() as string | null,
  utilisateur = ACHETEUR,
} = {}) {
  const mock = createSupabaseMock((op) => {
    if (op.table === "purchase_orders" && op.type === "select") {
      return { data: { id: BON, buyer_id: buyerId, status, cgv_accepted_at: cgvAcceptedAt } }
    }
    if (op.table === "purchase_orders" && op.type === "update") {
      return { data: { id: BON, status: "CANCELLED" } }
    }
    return { data: null }
  })
  requireUser.mockResolvedValue({ user: { id: utilisateur }, role: "BUYER", supabase: mock.client })
  return mock
}

function requete(corps: unknown) {
  return makeRequest(corps, { headers: { "x-forwarded-for": "203.0.113.8" } }) as any
}

describe("POST /api/purchase-orders/cancel", () => {
  beforeEach(() => vi.clearAllMocks())

  it("exige un motif d'au moins dix caractères", async () => {
    const mock = setup()

    const res = await POST(requete({ po_id: BON, reason: "annulé" }))

    expect(res.status).toBe(400)
    expect(mock.lastOp("purchase_orders")).toBeUndefined()
  })

  it("refuse une demande sans motif du tout", async () => {
    const mock = setup()

    const res = await POST(requete({ po_id: BON }))

    expect(res.status).toBe(400)
    expect(mock.lastOp("purchase_orders")).toBeUndefined()
  })

  it("refuse qu'un autre que l'acheteur annule", async () => {
    const mock = setup({ utilisateur: AUTRE })

    const res = await POST(requete({ po_id: BON, reason: MOTIF }))

    expect(res.status).toBe(403)
    expect(mock.lastOp("purchase_orders", "update")).toBeUndefined()
  })

  it("refuse l'annulation d'un bon jamais signé", async () => {
    const mock = setup({ cgvAcceptedAt: null })

    const res = await POST(requete({ po_id: BON, reason: MOTIF }))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: expect.stringMatching(/not yet signed/i) })
    expect(mock.lastOp("purchase_orders", "update")).toBeUndefined()
  })

  it("refuse l'annulation une fois les 48 heures écoulées", async () => {
    const mock = setup({ cgvAcceptedAt: new Date(Date.now() - 49 * HEURE).toISOString() })

    const res = await POST(requete({ po_id: BON, reason: MOTIF }))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ error: expect.stringMatching(/48h/i) })
    expect(mock.lastOp("purchase_orders", "update")).toBeUndefined()
  })

  it("accepte l'annulation à 47 heures, juste avant la fermeture", async () => {
    const mock = setup({ cgvAcceptedAt: new Date(Date.now() - 47 * HEURE).toISOString() })

    const res = await POST(requete({ po_id: BON, reason: MOTIF }))

    expect(res.status).toBeLessThan(400)
    expect(mock.lastOp("purchase_orders", "update")).toBeDefined()
  })

  it("refuse l'annulation d'un bon déjà confirmé, même dans la fenêtre", async () => {
    // La marchandise est engagée : la fenêtre ne rouvre pas un état terminal.
    const mock = setup({ status: "CONFIRMED" })

    const res = await POST(requete({ po_id: BON, reason: MOTIF }))

    expect(res.status).toBe(400)
    expect(mock.lastOp("purchase_orders", "update")).toBeUndefined()
  })
})
