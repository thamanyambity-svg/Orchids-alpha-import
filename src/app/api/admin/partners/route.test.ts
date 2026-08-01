import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

const requireRole = vi.fn()
const deleteUser = vi.fn()
const inviteUserByEmail = vi.fn()

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireRole: (...args: any[]) => requireRole(...args) }
})
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }))
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        inviteUserByEmail: (...args: any[]) => inviteUserByEmail(...args),
        deleteUser: (...args: any[]) => deleteUser(...args),
      },
    },
  }),
}))

const { POST } = await import("./route")

const COUNTRY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const NEW_USER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"

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

function setup({ partnerInsertFails = false } = {}) {
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
  deleteUser.mockResolvedValue({ error: null })

  return mock
}

describe("POST /api/admin/partners", () => {
  beforeEach(() => vi.clearAllMocks())

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

    expect(mock.lastOp("profiles", "update")?.payload.role).toBe("PARTNER")
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

  it("clôture la candidature d'origine quand elle est fournie", async () => {
    const mock = setup()

    await POST(makeRequest({ ...validPayload, application_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" }))

    expect(mock.lastOp("partner_applications", "update")?.payload.status).toBe("ACTIVE")
  })
})
