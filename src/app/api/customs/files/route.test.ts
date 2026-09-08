import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

/**
 * Dossiers douaniers — liste et création.
 *
 * La règle qui compte à la création est l'unicité : une commande n'a qu'un
 * dossier douanier. En créer un second scinderait la traçabilité d'une même
 * marchandise en deux historiques, et rien ne dirait lequel fait foi.
 *
 * En lecture, on vérifie que la route ne refiltre pas le périmètre elle-même :
 * les policies de la table s'en chargent déjà, et une seconde vérité finirait
 * par diverger de la première.
 */

const requireUser = vi.fn()
const requireRole = vi.fn()
const logAudit = vi.fn()

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return {
    ...actual,
    requireUser: (...args: any[]) => requireUser(...args),
    requireRole: (...args: any[]) => requireRole(...args),
  }
})
vi.mock("@/lib/audit", () => ({ logAudit: (...args: any[]) => logAudit(...args) }))

const { GET, POST } = await import("./route")

const COMMANDE = "11111111-1111-4111-8111-111111111111"
const DEMANDE = "22222222-2222-4222-8222-222222222222"
const DOSSIER = "33333333-3333-4333-8333-333333333333"
const ACTEUR = "44444444-4444-4444-8444-444444444444"

function requeteGet(url = "http://localhost/api/customs/files") {
  return { url, nextUrl: new URL(url) } as any
}

describe("GET /api/customs/files", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rattache à chaque dossier la référence de sa commande", async () => {
    const mock = createSupabaseMock((op) => {
      if (op.table === "customs_files") {
        return { data: [{ id: DOSSIER, order_id: COMMANDE, status: "IN_CUSTOMS" }] }
      }
      if (op.table === "orders") {
        return { data: [{ id: COMMANDE, reference: "AIX-20260809-0224" }] }
      }
      return { data: [] }
    })
    requireUser.mockResolvedValue({ user: { id: ACTEUR }, role: "ADMIN", supabase: mock.client })

    const res = await GET(requeteGet())

    expect(res.status).toBe(200)
    const corps = await res.json()
    expect(corps.files).toHaveLength(1)
    expect(corps.files[0]).toMatchObject({ id: DOSSIER, order_reference: "AIX-20260809-0224" })
  })

  it("laisse la référence à null quand la commande est introuvable", async () => {
    const mock = createSupabaseMock((op) => {
      if (op.table === "customs_files") return { data: [{ id: DOSSIER, order_id: COMMANDE }] }
      return { data: [] }
    })
    requireUser.mockResolvedValue({ user: { id: ACTEUR }, role: "ADMIN", supabase: mock.client })

    const res = await GET(requeteGet())

    const corps = await res.json()
    expect(corps.files[0].order_reference).toBeNull()
  })

  it("rend une liste vide sans échouer quand il n'y a aucun dossier", async () => {
    const mock = createSupabaseMock(() => ({ data: [] }))
    requireUser.mockResolvedValue({ user: { id: ACTEUR }, role: "BUYER", supabase: mock.client })

    const res = await GET(requeteGet())

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ files: [] })
  })
})

describe("POST /api/customs/files", () => {
  beforeEach(() => vi.clearAllMocks())

  function setup({ existant = null as any } = {}) {
    const mock = createSupabaseMock((op) => {
      if (op.table === "customs_files" && op.type === "select") return { data: existant }
      if (op.table === "customs_files" && op.type === "insert") {
        return { data: { id: DOSSIER, order_id: COMMANDE, status: "DRAFT" } }
      }
      return { data: null }
    })
    requireRole.mockResolvedValue({ user: { id: ACTEUR }, role: "ADMIN", supabase: mock.client })
    return mock
  }

  const charge = { order_id: COMMANDE, request_id: DEMANDE, country_code: "CD" }

  it("crée le dossier au statut brouillon, en enregistrant son auteur", async () => {
    const mock = setup()

    const res = await POST(makeRequest(charge) as any)

    expect(res.status).toBeLessThan(400)
    expect(mock.lastOp("customs_files", "insert")?.payload).toMatchObject({
      order_id: COMMANDE,
      status: "DRAFT",
      created_by: ACTEUR,
    })
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CUSTOMS_FILE_CREATED", actorId: ACTEUR })
    )
  })

  it("refuse un second dossier pour la même commande", async () => {
    const mock = setup({ existant: { id: DOSSIER } })

    const res = await POST(makeRequest(charge) as any)

    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toMatchObject({ id: DOSSIER })
    expect(mock.lastOp("customs_files", "insert")).toBeUndefined()
    expect(logAudit).not.toHaveBeenCalled()
  })

  it("refuse une charge dont les identifiants ne sont pas des UUID", async () => {
    const mock = setup()

    const res = await POST(makeRequest({ order_id: "abc", request_id: "def" }) as any)

    expect(res.status).toBe(400)
    expect(mock.lastOp("customs_files", "insert")).toBeUndefined()
  })

  it("refuse un mode de transport hors nomenclature", async () => {
    const mock = setup()

    const res = await POST(makeRequest({ ...charge, transport_mode: "TELEPORTATION" }) as any)

    expect(res.status).toBe(400)
    expect(mock.lastOp("customs_files", "insert")).toBeUndefined()
  })
})
