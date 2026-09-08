import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

const requireRole = vi.fn()

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireRole: (...args: any[]) => requireRole(...args) }
})

const { GET } = await import("./route")

const ADMIN = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"

const LOG = {
  id: "log-1",
  document_type: "PAYMENT_PROOF",
  document_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  action: "SIGNED_URL_GENERATED",
  accessed_by: ADMIN,
  admin_id: ADMIN,
  accessed_at: "2026-08-21T10:00:00.000Z",
  created_at: "2026-08-21T10:00:00.000Z",
  ip_address: "203.0.113.7",
  user_agent: "vitest",
  metadata: {},
}

function setup(rows: any[] = [LOG], count = 1) {
  const filters: { column: string; value: unknown }[] = []
  const ranges: { from: number; to: number }[] = []

  const mock = createSupabaseMock((op) => {
    if (op.table === "document_access_logs") return { data: rows, count } as any
    if (op.table === "profiles") return { data: [{ id: ADMIN, email: "admin@alpha.test", full_name: "Ada Admin" }] }
    return { data: null }
  })

  // On instrumente eq/range : ce que la route transmet à PostgREST fait partie du
  // contrat testé (filtres validés, pagination bornée).
  const originalFrom = mock.client.from
  mock.client.from = (table: string) => {
    const builder = originalFrom(table)
    const eq = builder.eq
    const range = builder.range
    builder.eq = (column: string, value: unknown) => {
      if (table === "document_access_logs") filters.push({ column, value })
      return eq(column, value)
    }
    builder.range = (from: number, to: number) => {
      ranges.push({ from, to })
      return range ? range(from, to) : builder
    }
    return builder
  }

  requireRole.mockResolvedValue({ user: { id: ADMIN }, role: "ADMIN", supabase: mock.client })
  return { mock, filters, ranges }
}

function req(query: string) {
  return makeRequest({}, { url: `http://localhost/api/admin/document-access-logs${query}` })
}

describe("GET /api/admin/document-access-logs", () => {
  beforeEach(() => vi.clearAllMocks())

  it("renvoie les entrées enrichies de l'identité de l'auteur", async () => {
    setup()

    const res = await GET(req(""))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(1)
    expect(body.logs[0]).toMatchObject({ actor_email: "admin@alpha.test", actor_full_name: "Ada Admin" })
  })

  it("applique les filtres reconnus", async () => {
    const { filters } = setup()

    await GET(req("?document_type=PAYMENT_PROOF&action=SIGNED_URL_GENERATED"))

    expect(filters).toEqual([
      { column: "document_type", value: "PAYMENT_PROOF" },
      { column: "action", value: "SIGNED_URL_GENERATED" },
    ])
  })

  it("ignore un filtre hors énumération plutôt que de le transmettre", async () => {
    const { filters } = setup()

    await GET(req("?document_type=DROP+TABLE&action=nope"))

    expect(filters).toEqual([])
  })

  it("borne la taille de page demandée", async () => {
    const { ranges } = setup()

    await GET(req("?page=2&page_size=5000"))

    // page 2 à 100 par page (plafond) : lignes 100 à 199.
    expect(ranges).toEqual([{ from: 100, to: 199 }])
  })
})
