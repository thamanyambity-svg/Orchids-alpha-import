import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

const requireRole = vi.fn()
const generateLink = vi.fn()

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireRole: (...args: any[]) => requireRole(...args) }
})
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }))
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: { admin: { generateLink: (...a: any[]) => generateLink(...a) } },
  }),
}))

const { POST } = await import("./route")

const PARTNER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const params = Promise.resolve({ id: PARTNER })
let n = 0

function setup(
  partnerRow: any = { id: PARTNER, user_id: "user-1", profile: { email: "p@example.com" } }
) {
  const mock = createSupabaseMock((op) =>
    op.table === "partner_profiles" ? { data: partnerRow } : { data: null }
  )
  requireRole.mockResolvedValue({
    user: { id: `admin-${++n}` },
    role: "ADMIN",
    supabase: mock.client,
  })
  generateLink.mockResolvedValue({
    data: { properties: { action_link: "https://supabase.example/verify?token=abc" } },
    error: null,
  })
  return mock
}

describe("POST /api/admin/partners/[id]/access-link", () => {
  beforeEach(() => vi.clearAllMocks())

  it("renvoie un lien d'accès pour le partenaire", async () => {
    setup()

    const res = await POST(makeRequest({}), { params })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      link: "https://supabase.example/verify?token=abc",
    })
  })

  it("renvoie 404 si le partenaire n'existe pas", async () => {
    setup(null)

    const res = await POST(makeRequest({}), { params })

    expect(res.status).toBe(404)
  })

  it("refuse si le partenaire n'a pas d'adresse email", async () => {
    setup({ id: PARTNER, user_id: "user-1", profile: null })

    const res = await POST(makeRequest({}), { params })

    expect(res.status).toBe(400)
    expect(generateLink).not.toHaveBeenCalled()
  })
})
