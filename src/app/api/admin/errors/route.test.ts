import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

/**
 * Consultation des incidents.
 *
 * Les messages et piles enregistrés peuvent contenir des fragments de données
 * appartenant à d'autres comptes, malgré la rédaction appliquée à l'écriture.
 * La lecture est donc strictement réservée aux administrateurs — et le refus
 * doit être un 403, jamais une liste vide : une liste vide se confond avec
 * « aucun incident », c'est-à-dire le message exactement inverse de la réalité
 * quand la plateforme tombe.
 */

const requireRole = vi.fn()
const logAudit = vi.fn()

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireRole: (...args: any[]) => requireRole(...args) }
})
vi.mock("@/lib/audit", () => ({ logAudit: (...args: any[]) => logAudit(...args) }))

const { GET, PATCH } = await import("./route")
const { ApiError } = await import("@/lib/auth-guard")

const ADMIN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const INCIDENT = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

function setup(lignes: unknown[] = []) {
  const mock = createSupabaseMock((op) => {
    if (op.table === "error_events" && op.type === "select") return { data: lignes }
    if (op.table === "error_events" && op.type === "update") {
      return { data: { id: INCIDENT, fingerprint: "abc", resolved_at: null } }
    }
    return { data: null }
  })
  requireRole.mockResolvedValue({ user: { id: ADMIN }, role: "ADMIN", supabase: mock.client })
  return mock
}

function requeteGet(query = "") {
  return new Request(`https://site.test/api/admin/errors${query}`) as any
}

describe("GET /api/admin/errors", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("refuse un appelant non administrateur par un 403, pas par une liste vide", async () => {
    requireRole.mockRejectedValue(new ApiError(403, "Forbidden: requires one of [ADMIN]"))

    const res = await GET(requeteGet())

    expect(res.status).toBe(403)
  })

  it("refuse un appelant non connecté", async () => {
    requireRole.mockRejectedValue(new ApiError(401, "Unauthorized"))

    expect((await GET(requeteGet())).status).toBe(401)
  })

  it("ne montre par défaut que les incidents non acquittés", async () => {
    const mock = setup([])

    await GET(requeteGet())

    // Sans ce filtre, la liste est dominée par des incidents déjà traités.
    expect(mock.aFiltre("error_events", "is", "resolved_at")).toBe(true)
  })

  it("additionne les occurrences, pas seulement le nombre de lignes", async () => {
    // Une ligne à 4000 occurrences et une à 1 ne pèsent pas pareil.
    setup([
      { id: "1", occurrences: 4000 },
      { id: "2", occurrences: 1 },
    ])

    const res = await GET(requeteGet())

    await expect(res.json()).resolves.toMatchObject({ total: 2, occurrences: 4001 })
  })

  it("refuse une limite hors bornes au lieu de la subir", async () => {
    setup([])

    expect((await GET(requeteGet("?limite=99999"))).status).toBe(400)
    expect((await GET(requeteGet("?limite=0"))).status).toBe(400)
  })

  it("refuse un filtre de statut inconnu", async () => {
    setup([])

    expect((await GET(requeteGet("?statut=nimporte"))).status).toBe(400)
  })

  it("accepte les filtres valides", async () => {
    setup([])

    expect((await GET(requeteGet("?statut=tous&source=api&limite=10"))).status).toBe(200)
  })

  it("ne filtre pas sur le statut quand on demande tous les incidents", async () => {
    const mock = setup([])

    await GET(requeteGet("?statut=tous"))

    expect(mock.aFiltre("error_events", "is", "resolved_at")).toBe(false)
    expect(mock.aFiltre("error_events", "not.is", "resolved_at")).toBe(false)
  })

  it("restreint bien à la source demandée", async () => {
    const mock = setup([])

    await GET(requeteGet("?source=api"))

    expect(mock.aFiltre("error_events", "eq", "source")).toBe(true)
  })
})

describe("PATCH /api/admin/errors", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("exige le rôle administrateur pour acquitter", async () => {
    requireRole.mockRejectedValue(new ApiError(403, "Forbidden"))

    const res = await PATCH(makeRequest({ id: INCIDENT, resolu: true }) as any)

    expect(res.status).toBe(403)
    expect(logAudit).not.toHaveBeenCalled()
  })

  it("refuse un identifiant qui n'est pas un UUID", async () => {
    const mock = setup()

    const res = await PATCH(makeRequest({ id: "incident-1", resolu: true }) as any)

    expect(res.status).toBe(400)
    expect(mock.lastOp("error_events", "update")).toBeUndefined()
  })

  it("refuse une charge vide", async () => {
    setup()

    expect((await PATCH(makeRequest({}) as any)).status).toBe(400)
  })

  it("acquitte l'incident en traçant qui l'a fait", async () => {
    setup()

    const res = await PATCH(makeRequest({ id: INCIDENT, resolu: true }) as any)

    expect(res.status).toBe(200)
    // Un acquittement est une décision : elle doit être imputable.
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ERROR_EVENT_RESOLVED",
        targetId: INCIDENT,
        actorId: ADMIN,
      })
    )
  })

  it("distingue la réouverture de l'acquittement dans l'audit", async () => {
    setup()

    await PATCH(makeRequest({ id: INCIDENT, resolu: false }) as any)

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ERROR_EVENT_REOPENED" })
    )
  })
})
