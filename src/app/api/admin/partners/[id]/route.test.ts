import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

/**
 * Modification d'un partenaire. La fenêtre d'édition écrivait le profil depuis
 * le navigateur, où l'administrateur n'a aucun droit de mise à jour sur le
 * compte d'un autre : nom, société, ville et statut étaient perdus pendant que
 * la fenêtre annonçait un succès.
 */

const requireRole = vi.fn()
const logAudit = vi.fn()
let service: ReturnType<typeof createSupabaseMock>

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireRole: (...a: any[]) => requireRole(...a) }
})
vi.mock("@/lib/audit", () => ({ logAudit: (...a: any[]) => logAudit(...a) }))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => service.client }))

const { PATCH } = await import("./route")
const { ApiError } = await import("@/lib/auth-guard")

const ADMIN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const FICHE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const COMPTE = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
const ctx = (id = FICHE) => ({ params: Promise.resolve({ id }) })

const CORPS = {
  full_name: "Achignon Bilongo",
  company_name: "MAARMALA SARL",
  city: "Dubaï",
  status: "VERIFIED",
  assigned_cities: ["Dubaï", "Sharjah"],
  performance_score: 4.5,
  contract_status: "ACTIVE",
}

function setup({ fiche = true, profil = true } = {}) {
  service = createSupabaseMock((op) => {
    if (op.table === "partner_profiles" && op.type === "update") return { data: fiche ? [{ id: FICHE, user_id: COMPTE }] : [] }
    if (op.table === "profiles" && op.type === "update") return { data: profil ? [{ id: COMPTE }] : [] }
    return { data: null }
  })
  requireRole.mockResolvedValue({ user: { id: ADMIN }, role: "ADMIN", supabase: {} })
}

describe("PATCH /api/admin/partners/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("refuse un non-administrateur sans rien écrire", async () => {
    setup()
    requireRole.mockRejectedValue(new ApiError(403, "Forbidden"))

    expect((await PATCH(makeRequest(CORPS) as any, ctx())).status).toBe(403)
    expect(service.ops.length).toBe(0)
  })

  it("refuse un identifiant qui n'est pas un UUID", async () => {
    setup()
    expect((await PATCH(makeRequest(CORPS) as any, ctx("p-1"))).status).toBe(400)
    expect(service.ops.length).toBe(0)
  })

  it("refuse un statut de contrat hors nomenclature", async () => {
    setup()
    expect((await PATCH(makeRequest({ ...CORPS, contract_status: "SIGNED" }) as any, ctx())).status).toBe(400)
    expect(service.ops.length).toBe(0)
  })

  it("refuse une note au-delà de 5", async () => {
    setup()
    expect((await PATCH(makeRequest({ ...CORPS, performance_score: 7 }) as any, ctx())).status).toBe(400)
  })

  it("écrit la fiche puis le profil du bon compte, par la clé de service", async () => {
    setup()

    const res = await PATCH(makeRequest(CORPS) as any, ctx())

    expect(res.status).toBe(200)
    expect(service.lastOp("partner_profiles", "update")?.payload).toMatchObject({
      contract_status: "ACTIVE",
      assigned_cities: ["Dubaï", "Sharjah"],
    })
    expect(service.lastOp("profiles", "update")?.payload).toMatchObject({
      company_name: "MAARMALA SARL",
      city: "Dubaï",
      status: "VERIFIED",
    })
  })

  it("renvoie 404 sans toucher au profil quand la fiche n'existe pas", async () => {
    setup({ fiche: false })

    expect((await PATCH(makeRequest(CORPS) as any, ctx())).status).toBe(404)
    expect(service.lastOp("profiles", "update")).toBeUndefined()
  })

  it("refuse d'annoncer un succès quand le profil n'est pas modifié", async () => {
    // L'échec silencieux d'origine, sur la seconde écriture.
    setup({ profil: false })

    expect((await PATCH(makeRequest(CORPS) as any, ctx())).status).toBe(404)
    expect(logAudit).not.toHaveBeenCalled()
  })

  it("trace la modification", async () => {
    setup()

    await PATCH(makeRequest(CORPS) as any, ctx())

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "UPDATE_PARTNER", actorId: ADMIN, targetId: FICHE })
    )
  })
})
