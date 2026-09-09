import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

/**
 * Transition d'état d'une demande ou d'une commande.
 *
 * C'est la route qui fait avancer un dossier. Deux garanties comptent.
 *
 * La matrice est la seule autorité : un état ne change que si le couple
 * (départ, arrivée) existe et que le rôle de l'appelant y figure. L'état de
 * départ est relu en base, jamais accepté du client — sinon il suffirait de
 * déclarer un départ arrangeant pour atteindre n'importe quelle arrivée.
 *
 * Et rien n'est écrit quand la transition est refusée : c'est cette absence
 * d'écriture qui protège, pas le code de retour.
 */

const requireUser = vi.fn()

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireUser: (...args: any[]) => requireUser(...args) }
})

const { POST } = await import("./route")
const { ApiError } = await import("@/lib/auth-guard")

const ACTEUR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const DOSSIER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

function setup({
  role = "ADMIN",
  statutDemande = "PENDING",
  statutCommande = "PENDING_PAYMENT",
  visible = true,
} = {}) {
  const mock = createSupabaseMock((op) => {
    if (op.table === "import_requests" && op.type === "select") {
      return visible
        ? { data: { status: statutDemande, buyer_id: ACTEUR } }
        : { data: null, error: { message: "not found" } }
    }
    if (op.table === "orders" && op.type === "select") {
      return visible ? { data: { status: statutCommande } } : { data: null, error: { message: "not found" } }
    }
    return { data: null }
  })
  requireUser.mockResolvedValue({ user: { id: ACTEUR }, role, supabase: mock.client })
  return mock
}

const req = (corps: unknown) => makeRequest(corps) as any

describe("POST /api/workflow/transition", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("exige une session", async () => {
    requireUser.mockRejectedValue(new ApiError(401, "Unauthorized"))

    const res = await POST(req({ type: "REQUEST", id: DOSSIER, targetStatus: "ANALYSIS" }))

    expect(res.status).toBe(401)
  })

  it("refuse un identifiant qui n'est pas un UUID", async () => {
    const mock = setup()

    const res = await POST(req({ type: "REQUEST", id: "dossier-1", targetStatus: "ANALYSIS" }))

    expect(res.status).toBe(400)
    expect(mock.lastOp("import_requests")).toBeUndefined()
  })

  it("refuse un type d'objet inconnu", async () => {
    const mock = setup()

    const res = await POST(req({ type: "FACTURE", id: DOSSIER, targetStatus: "X" }))

    expect(res.status).toBe(400)
    expect(mock.ops.length).toBe(0)
  })

  it("renvoie 404 pour une demande que l'appelant ne voit pas", async () => {
    // La portée vient de RLS.
    const mock = setup({ visible: false })

    const res = await POST(req({ type: "REQUEST", id: DOSSIER, targetStatus: "ANALYSIS" }))

    expect(res.status).toBe(404)
    expect(mock.lastOp("import_requests", "update")).toBeUndefined()
  })

  it("laisse un administrateur ouvrir l'analyse d'une demande en attente", async () => {
    const mock = setup({ role: "ADMIN", statutDemande: "PENDING" })

    const res = await POST(req({ type: "REQUEST", id: DOSSIER, targetStatus: "ANALYSIS" }))

    expect(res.status).toBe(200)
    expect(mock.lastOp("import_requests", "update")?.payload).toMatchObject({ status: "ANALYSIS" })
  })

  it("refuse à un acheteur une transition réservée à l'administration", async () => {
    const mock = setup({ role: "BUYER", statutDemande: "PENDING" })

    const res = await POST(req({ type: "REQUEST", id: DOSSIER, targetStatus: "ANALYSIS" }))

    expect(res.status).toBe(403)
    expect(mock.lastOp("import_requests", "update")).toBeUndefined()
  })

  it("refuse un saut d'état absent de la matrice", async () => {
    // DRAFT -> VALIDATED n'existe pas : sauter l'analyse validerait une
    // demande que personne n'a instruite.
    const mock = setup({ role: "ADMIN", statutDemande: "DRAFT" })

    const res = await POST(req({ type: "REQUEST", id: DOSSIER, targetStatus: "VALIDATED" }))

    expect(res.status).toBe(403)
    expect(mock.lastOp("import_requests", "update")).toBeUndefined()
  })

  it("refuse un état d'arrivée qui n'existe pas", async () => {
    const mock = setup({ role: "ADMIN" })

    const res = await POST(req({ type: "REQUEST", id: DOSSIER, targetStatus: "N_IMPORTE_QUOI" }))

    expect(res.status).toBe(403)
    expect(mock.lastOp("import_requests", "update")).toBeUndefined()
  })

  it("relit l'état de départ en base plutôt que de le croire sur parole", async () => {
    // L'appelant déclare un départ arrangeant ; seul celui de la base compte.
    const mock = setup({ role: "ADMIN", statutDemande: "DRAFT" })

    const res = await POST(
      req({ type: "REQUEST", id: DOSSIER, targetStatus: "VALIDATED", currentStatus: "ANALYSIS" })
    )

    expect(res.status).toBe(403)
    expect(mock.lastOp("import_requests", "update")).toBeUndefined()
  })

  it("trace la transition d'une demande dans le journal d'audit", async () => {
    const mock = setup({ role: "ADMIN", statutDemande: "PENDING" })

    await POST(req({ type: "REQUEST", id: DOSSIER, targetStatus: "ANALYSIS", reason: "instruction ouverte" }))

    const audit = mock.lastOp("audit_logs", "insert")?.payload
    expect(audit).toMatchObject({
      actor_id: ACTEUR,
      action: "TRANSITION_REQUEST",
      target_id: DOSSIER,
      details: { from: "PENDING", to: "ANALYSIS", reason: "instruction ouverte" },
    })
  })

  it("renvoie 404 pour une commande que l'appelant ne voit pas", async () => {
    const mock = setup({ visible: false })

    const res = await POST(req({ type: "ORDER", id: DOSSIER, targetStatus: "IN_PRODUCTION" }))

    expect(res.status).toBe(404)
    expect(mock.lastOp("orders", "update")).toBeUndefined()
  })

  it("refuse un saut d'état sur une commande", async () => {
    const mock = setup({ role: "ADMIN", statutCommande: "PENDING_PAYMENT" })

    const res = await POST(req({ type: "ORDER", id: DOSSIER, targetStatus: "DELIVERED" }))

    expect(res.status).toBe(403)
    expect(mock.lastOp("orders", "update")).toBeUndefined()
  })

  it("horodate la mise à jour", async () => {
    // Sans updated_at, l'ordre des dossiers dans le back-office est faux.
    const mock = setup({ role: "ADMIN", statutDemande: "PENDING" })

    await POST(req({ type: "REQUEST", id: DOSSIER, targetStatus: "ANALYSIS" }))

    expect(mock.lastOp("import_requests", "update")?.payload.updated_at).toBeTruthy()
  })
})
