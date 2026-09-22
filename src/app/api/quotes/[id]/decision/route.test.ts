import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

/**
 * Décisions sur une pro forma : l'administration valide ou renvoie un
 * brouillon ; le client accepte ou demande une révision. Chaque décision a
 * son décideur, son statut de départ, et ne s'applique qu'une fois.
 */

const requireUser = vi.fn()
let db: ReturnType<typeof createSupabaseMock>

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireUser: (...a: any[]) => requireUser(...a) }
})
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => db.client }))
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: () => ({ allowed: true }) }))
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(() => Promise.resolve()) }))
vi.mock("@/lib/webhooks", () => ({ sendToN8N: vi.fn(() => Promise.resolve()) }))

const { POST } = await import("./route")

const QUOTE = "99999999-9999-4999-8999-999999999999"
const DEMANDE = "11111111-1111-4111-8111-111111111111"
const ACHETEUR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const PARTENAIRE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const FICHE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const ADMIN = "ffffffff-ffff-4fff-8fff-ffffffffffff"
const INTRUS = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"

const ctx = (id = QUOTE) => ({ params: Promise.resolve({ id }) })

function setup({
  compte = ADMIN,
  role = "ADMIN",
  statut = "DRAFT",
  soumise = null as string | null,
  validite = null as string | null,
  lignesMaj = 1,
} = {}) {
  db = createSupabaseMock((op) => {
    if (op.table === "quotes" && op.type === "select") {
      return {
        data: {
          id: QUOTE, request_id: DEMANDE, status: statut, version: 2, validity_days: 30,
          valid_until: validite, grand_total_usd: 39585, currency: "USD", submitted_at: soumise,
        },
      }
    }
    if (op.table === "quotes" && op.type === "update") {
      const principale = op.filtres.some((f) => f.colonne === "id" && f.operateur === "eq" && f.valeur === QUOTE)
      return { data: principale && lignesMaj ? { id: QUOTE, grand_total_usd: 39585, ...op.payload } : null }
    }
    if (op.table === "import_requests") return { data: { buyer_id: ACHETEUR, assigned_partner_id: FICHE, reference: "AIX-20260911-2496" } }
    if (op.table === "partner_profiles") return { data: { user_id: PARTENAIRE } }
    if (op.table === "purchase_orders") return { data: { id: "po-1", po_number: "PO-2026-0001" } }
    if (op.table === "profiles") return { data: [{ id: ADMIN }] }
    return { data: null }
  })
  requireUser.mockResolvedValue({ user: { id: compte }, role, supabase: {} })
}

const decider = (action: string, motif?: string) => POST(makeRequest({ action, motif }), ctx())
const majPrincipale = () =>
  db.ops.find((o) => o.table === "quotes" && o.type === "update" && o.filtres.some((f) => f.colonne === "id" && f.valeur === QUOTE))

describe("POST /api/quotes/[id]/decision", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-22T10:00:00Z"))
    vi.spyOn(console, "error").mockImplementation(() => {})
  })
  afterEach(() => vi.useRealTimers())

  describe("validation par l'administration", () => {
    it("transmet le brouillon au client avec sa date de validité", async () => {
      setup()
      const res = await decider("approve")

      expect(res.status).toBe(200)
      expect(majPrincipale()?.payload).toEqual({
        status: "SUBMITTED",
        submitted_at: "2026-09-22T10:00:00.000Z",
        valid_until: "2026-10-22",
      })
    })

    it("n'écrit que si le statut n'a pas changé entre-temps", async () => {
      setup()
      await decider("approve")
      expect(majPrincipale()?.filtres).toContainEqual({ operateur: "eq", colonne: "status", valeur: "DRAFT" })
    })

    it("remplace la version précédente encore en attente de réponse", async () => {
      setup()
      await decider("approve")

      const remplacement = db.ops.find(
        (o) => o.table === "quotes" && o.type === "update" && o.filtres.some((f) => f.operateur === "neq" && f.valeur === QUOTE)
      )
      expect(remplacement?.payload).toMatchObject({ status: "REVISED" })
      expect(remplacement?.filtres).toContainEqual({ operateur: "eq", colonne: "status", valeur: "SUBMITTED" })
    })

    it("prévient le client et le partenaire, et l'annonce dans la discussion", async () => {
      setup()
      await decider("approve")

      const notes = db.ops.filter((o) => o.table === "notifications").flatMap((o) => o.payload)
      expect(notes.map((n: any) => n.user_id).sort()).toEqual([ACHETEUR, PARTENAIRE].sort())
      expect(notes.find((n: any) => n.user_id === ACHETEUR).link).toBe(`/dashboard/requests/${DEMANDE}?onglet=quotes`)
      expect(notes.find((n: any) => n.user_id === PARTENAIRE).link).toBe(`/partner/requests/${DEMANDE}`)
      expect(db.lastOp("messages", "insert")?.payload.content).toContain("22/10/2026")
    })

    it("est refusée au partenaire et au client", async () => {
      setup({ compte: PARTENAIRE, role: "PARTNER" })
      expect((await decider("approve")).status).toBe(403)
      setup({ compte: ACHETEUR, role: "BUYER", soumise: "2026-09-20T10:00:00Z" })
      expect((await decider("approve")).status).toBe(403)
      expect(majPrincipale()).toBeUndefined()
    })

    it("refuse de valider ce qui n'est pas un brouillon", async () => {
      setup({ statut: "SUBMITTED" })
      expect((await decider("approve")).status).toBe(409)
      expect(majPrincipale()).toBeUndefined()
    })

    it("répond 409 quand une autre décision est passée avant", async () => {
      setup({ lignesMaj: 0 })
      expect((await decider("approve")).status).toBe(409)
    })
  })

  describe("renvoi au partenaire", () => {
    it("exige un motif et le transmet au seul partenaire, hors discussion", async () => {
      setup()
      expect((await decider("return", "")).status).toBe(400)
      expect((await decider("return", "ok")).status).toBe(400)

      const res = await decider("return", "Fret à justifier, CIF attendu")
      expect(res.status).toBe(200)
      expect(majPrincipale()?.payload).toEqual({ status: "REJECTED", rejected_reason: "Fret à justifier, CIF attendu" })
      const notes = db.ops.filter((o) => o.table === "notifications").flatMap((o) => o.payload)
      expect(notes.map((n: any) => n.user_id)).toEqual([PARTENAIRE])
      expect(db.lastOp("messages", "insert")).toBeUndefined()
    })
  })

  describe("réponse du client", () => {
    const client = { compte: ACHETEUR, role: "BUYER", statut: "SUBMITTED", soumise: "2026-09-20T10:00:00Z", validite: "2026-10-20" }

    it("accepte : la pro forma passe en ACCEPTED et le bon de commande est renvoyé", async () => {
      setup(client)
      const res = await decider("accept")

      expect(res.status).toBe(200)
      expect(majPrincipale()?.payload).toEqual({ status: "ACCEPTED", accepted_at: "2026-09-22T10:00:00.000Z" })
      await expect(res.json()).resolves.toMatchObject({ purchase_order: { po_number: "PO-2026-0001" } })
    })

    it("refuse d'accepter une pro forma expirée et la marque expirée", async () => {
      setup({ ...client, validite: "2026-09-21" })
      const res = await decider("accept")

      expect(res.status).toBe(409)
      expect(majPrincipale()?.payload).toEqual({ status: "EXPIRED" })
    })

    it("demande une révision avec motif, annoncée au partenaire, à l'administration et dans la discussion", async () => {
      setup(client)
      expect((await decider("revise", "")).status).toBe(400)

      const res = await decider("revise", "Couleur noire et livraison à Matadi")
      expect(res.status).toBe(200)
      expect(majPrincipale()?.payload).toEqual({ status: "REVISED", rejected_reason: "Couleur noire et livraison à Matadi" })
      const notes = db.ops.filter((o) => o.table === "notifications").flatMap((o) => o.payload)
      expect(notes.map((n: any) => n.user_id).sort()).toEqual([ADMIN, PARTENAIRE].sort())
      expect(db.lastOp("messages", "insert")?.payload).toMatchObject({ sender_id: ACHETEUR })
    })

    it("réserve l'acceptation au client : ni le partenaire ni l'administration", async () => {
      setup({ ...client, compte: PARTENAIRE, role: "PARTNER" })
      expect((await decider("accept")).status).toBe(403)
      setup({ ...client, compte: ADMIN, role: "ADMIN" })
      expect((await decider("accept")).status).toBe(403)
    })

    it("ne laisse pas le client agir sur un brouillon, ni en deviner l'existence", async () => {
      setup({ compte: ACHETEUR, role: "BUYER", statut: "DRAFT", soumise: null })
      expect((await decider("accept")).status).toBe(404)
      expect((await decider("revise", "trop cher")).status).toBe(404)
    })
  })

  it("répond 404 à un compte étranger à la demande", async () => {
    setup({ compte: INTRUS, role: "BUYER", statut: "SUBMITTED", soumise: "2026-09-20T10:00:00Z" })
    expect((await decider("accept")).status).toBe(404)
    expect(majPrincipale()).toBeUndefined()
  })

  it("refuse une action inconnue ou un identifiant mal formé", async () => {
    setup()
    expect((await decider("delete")).status).toBe(400)
    expect((await POST(makeRequest({ action: "approve" }), ctx("abc"))).status).toBe(400)
  })
})
