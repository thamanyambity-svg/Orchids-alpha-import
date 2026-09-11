import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

const requireRole = vi.fn()
const deleteUser = vi.fn()
const inviteUserByEmail = vi.fn()
const listUsers = vi.fn()

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireRole: (...args: any[]) => requireRole(...args) }
})
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }))
// Client de service séparé du client de session : c'est la distinction qui
// compte. Un administrateur n'a, en RLS, aucun droit de mise à jour sur le
// profil d'un autre compte ; seul le client de service peut basculer le rôle.
let service: ReturnType<typeof createSupabaseMock>

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (...args: any[]) => (service.client.from as any)(...args),
    auth: {
      admin: {
        inviteUserByEmail: (...args: any[]) => inviteUserByEmail(...args),
        deleteUser: (...args: any[]) => deleteUser(...args),
        listUsers: (...args: any[]) => listUsers(...args),
      },
    },
  }),
}))

const { POST, GET } = await import("./route")
const { ApiError } = await import("@/lib/auth-guard")

const COUNTRY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const NEW_USER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const EXISTING_USER = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"

const validPayload = {
  email: "shanghai.logistics@alpha-import.com",
  full_name: "Chen Wei",
  company_name: "Alpha Logistics China",
  country_id: COUNTRY,
  whatsapp_number: "+86 138 1234 5678",
  address_line: "Futian District, Shenzhen",
  commission_rate: 10,
}

let userCounter = 0

function setup({ partnerInsertFails = false, profilSansLigne = false } = {}) {
  service = createSupabaseMock((op) => {
    if (op.table === "profiles" && op.type === "update") {
      // Un UPDATE qui ne trouve pas sa ligne renvoie un tableau vide, sans
      // erreur : c'est exactement l'échec silencieux observé en production.
      return { data: profilSansLigne ? [] : [{ id: NEW_USER }] }
    }
    return { data: null }
  })

  const mock = createSupabaseMock((op) => {
    if (op.table === "partner_profiles" && op.type === "insert") {
      return partnerInsertFails
        ? { error: { message: "boom" } }
        : { data: { id: "partner-1", ...op.payload } }
    }
    if (op.table === "profiles") return { data: { id: NEW_USER, role: "PARTNER" } }
    if (op.table === "partner_applications") return { data: { id: "app-1" } }
    return { data: null }
  })

  requireRole.mockResolvedValue({
    user: { id: `admin-${++userCounter}` },
    role: "ADMIN",
    supabase: mock.client,
  })
  inviteUserByEmail.mockResolvedValue({ data: { user: { id: NEW_USER } }, error: null })
  listUsers.mockResolvedValue({ data: { users: [] }, error: null })
  deleteUser.mockResolvedValue({ error: null })

  return mock
}

describe("GET /api/admin/partners — liste pour l'assignation", () => {
  beforeEach(() => vi.clearAllMocks())

  it("est réservée à l'administration, sans rien lire", async () => {
    service = createSupabaseMock(() => ({ data: [] }))
    requireRole.mockRejectedValue(new ApiError(403, "Forbidden"))

    expect((await GET()).status).toBe(403)
    expect(service.ops.length).toBe(0)
  })

  it("lit avec la clé de service et renvoie les partenaires", async () => {
    // Lue avec la session admin, la table revenait vide : la fenêtre
    // d'assignation affichait « Aucun partenaire enregistré ».
    service = createSupabaseMock((op) =>
      op.table === "partner_profiles"
        ? { data: [{ id: "fiche-1", contract_status: "ACTIVE", country_id: COUNTRY, user: { full_name: "Achignon Bilongo", company_name: "MAARMALA SARL" } }] }
        : { data: null }
    )
    requireRole.mockResolvedValue({ user: { id: "admin-x" }, role: "ADMIN", supabase: { from: () => { throw new Error("session interdite") } } })

    const res = await GET()

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ partners: [{ id: "fiche-1", user: { company_name: "MAARMALA SARL" } }] })
    expect(service.lastOp("partner_profiles")).toBeDefined()
  })

  it("renvoie une liste vide plutôt que null", async () => {
    service = createSupabaseMock(() => ({ data: null }))
    requireRole.mockResolvedValue({ user: { id: "admin-x" }, role: "ADMIN", supabase: {} })

    await expect((await GET()).json()).resolves.toEqual({ partners: [] })
  })
})

describe("POST /api/admin/partners", () => {
  beforeEach(() => vi.clearAllMocks())

  it("bascule le profil avec la clé de service, jamais avec la session admin", async () => {
    // Avec la session, l'UPDATE touchait zéro ligne sans erreur : le premier
    // partenaire réel est resté BUYER, sans société ni téléphone.
    const mock = setup()

    await POST(makeRequest(validPayload) as any)

    expect(service.lastOp("profiles", "update")?.payload).toMatchObject({
      role: "PARTNER",
      company_name: validPayload.company_name,
    })
    expect(mock.lastOp("profiles", "update")).toBeUndefined()
  })

  it("échoue et supprime le compte créé quand le profil n'est pas mis à jour", async () => {
    // Zéro ligne modifiée n'est pas un succès. Sans cette garde, la fiche
    // partenaire se créait quand même, rattachée à un compte resté BUYER.
    const mock = setup({ profilSansLigne: true })
    vi.spyOn(console, "error").mockImplementation(() => {})

    const res = await POST(makeRequest(validPayload) as any)

    expect(res.status).toBe(500)
    expect(mock.lastOp("partner_profiles", "insert")).toBeUndefined()
    expect(deleteUser).toHaveBeenCalledWith(NEW_USER)
  })

  it("crée le partenaire et renvoie son identifiant", async () => {
    const mock = setup()

    const res = await POST(makeRequest(validPayload))

    expect(res.status).toBe(200)
    expect(inviteUserByEmail).toHaveBeenCalledWith(validPayload.email, expect.anything())
    expect(mock.lastOp("partner_profiles", "insert")?.payload.user_id).toBe(NEW_USER)
  })

  it("normalise le numéro WhatsApp avant insertion", async () => {
    const mock = setup()

    await POST(makeRequest(validPayload))

    expect(mock.lastOp("partner_profiles", "insert")?.payload.whatsapp_number).toBe(
      "+8613812345678"
    )
  })

  // handle_new_user crée le profil en BUYER : sans cette bascule le partenaire
  // n'aurait aucun de ses droits.
  it("bascule le profil sur le rôle PARTNER", async () => {
    const mock = setup()

    await POST(makeRequest(validPayload))

    expect(service.lastOp("profiles", "update")?.payload.role).toBe("PARTNER")
  })

  // Sans compensation, l'adresse reste prise par un compte sans profil et le
  // partenaire devient impossible à recréer.
  it("supprime le compte auth si l'insertion du partenaire échoue", async () => {
    setup({ partnerInsertFails: true })

    const res = await POST(makeRequest(validPayload))

    expect(res.status).toBe(500)
    expect(deleteUser).toHaveBeenCalledWith(NEW_USER)
  })

  it("refuse un numéro WhatsApp sans indicatif international", async () => {
    setup()

    const res = await POST(makeRequest({ ...validPayload, whatsapp_number: "0532 123 45 67" }))

    expect(res.status).toBe(400)
    expect(inviteUserByEmail).not.toHaveBeenCalled()
  })

  it("rejette un payload incomplet", async () => {
    setup()

    const res = await POST(makeRequest({ email: "pas-un-email" }))

    expect(res.status).toBe(400)
  })

  // Cas réel : un compte créé avant cette fonctionnalité, ou un acheteur qui
  // devient partenaire. Inviter échouerait, l'adresse étant déjà prise.
  it("rattache un compte existant au lieu d'échouer", async () => {
    const mock = setup()
    inviteUserByEmail.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "A user with this email address has already been registered" },
    })
    listUsers.mockResolvedValueOnce({
      data: { users: [{ id: EXISTING_USER, email: validPayload.email }] },
      error: null,
    })

    const res = await POST(makeRequest(validPayload))

    expect(res.status).toBe(200)
    expect(mock.lastOp("partner_profiles", "insert")?.payload.user_id).toBe(EXISTING_USER)
  })

  it("ne supprime jamais un compte préexistant en cas d'échec", async () => {
    setup({ partnerInsertFails: true })
    inviteUserByEmail.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "already been registered" },
    })
    listUsers.mockResolvedValueOnce({
      data: { users: [{ id: EXISTING_USER, email: validPayload.email }] },
      error: null,
    })

    const res = await POST(makeRequest(validPayload))

    expect(res.status).toBe(500)
    expect(deleteUser).not.toHaveBeenCalled()
  })

  it("refuse si le compte est déjà partenaire", async () => {
    const mock = createSupabaseMock((op) => {
      if (op.table === "partner_profiles" && op.type === "select") {
        return { data: { id: "deja-partenaire" } }
      }
      return { data: null }
    })
    requireRole.mockResolvedValue({
      user: { id: `admin-${++userCounter}` },
      role: "ADMIN",
      supabase: mock.client,
    })
    inviteUserByEmail.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "already been registered" },
    })
    listUsers.mockResolvedValueOnce({
      data: { users: [{ id: EXISTING_USER, email: validPayload.email }] },
      error: null,
    })

    const res = await POST(makeRequest(validPayload))

    expect(res.status).toBe(409)
  })

  it("clôture la candidature d'origine quand elle est fournie", async () => {
    const mock = setup()

    await POST(makeRequest({ ...validPayload, application_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" }))

    expect(mock.lastOp("partner_applications", "update")?.payload.status).toBe("ACTIVE")
  })
})
