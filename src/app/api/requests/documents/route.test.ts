import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

/**
 * Rattachement d'un document à une demande. L'insertion écrivait des colonnes
 * inexistantes (chaque document échouait) et enregistrait un lien public. Les
 * tests portent sur les colonnes réelles, le lien privé, le dossier imposé et
 * l'identité de l'auteur tirée de la session.
 */

const requireUser = vi.fn()
const sendToN8N = vi.fn((..._a: unknown[]) => Promise.resolve())
let db: ReturnType<typeof createSupabaseMock>

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return { ...actual, requireUser: (...a: any[]) => requireUser(...a) }
})
vi.mock("@/lib/webhooks", () => ({ sendToN8N: (...a: unknown[]) => sendToN8N(...a) }))
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: () => ({ allowed: true }) }))

const { POST } = await import("./route")

const MOI = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const DEMANDE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const AUTRE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

function corps(extra: Record<string, unknown> = {}) {
  return {
    requestId: DEMANDE,
    service: "LOGISTICS",
    type: "BILL_OF_LADING",
    filePath: `requests/${DEMANDE}/1700000000000.pdf`,
    fileName: "connaissement.pdf",
    fileSize: 1234,
    ...extra,
  }
}

function setup({ visible = true } = {}) {
  db = createSupabaseMock((op) => {
    if (op.table === "import_requests") return { data: visible ? { id: DEMANDE } : null }
    if (op.table === "request_documents") return { data: { id: "doc-1", ...op.payload } }
    return { data: null }
  })
  requireUser.mockResolvedValue({ supabase: db.client, user: { id: MOI } })
}

describe("POST /api/requests/documents", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("écrit les colonnes réelles et un lien privé", async () => {
    setup()
    const res = await POST(makeRequest(corps()))

    expect(res.status).toBe(200)
    expect(db.lastOp("request_documents", "insert")?.payload).toEqual({
      request_id: DEMANDE,
      document_type: "LOGISTICS:BILL_OF_LADING",
      name: "connaissement.pdf",
      file_url: `/api/files/documents?path=${encodeURIComponent(`requests/${DEMANDE}/1700000000000.pdf`)}`,
      file_type: "pdf",
      file_size: 1234,
      uploaded_by: MOI,
    })
  })

  it("prend l'auteur dans la session, jamais dans le corps", async () => {
    setup()
    await POST(makeRequest(corps({ uploadedBy: AUTRE })))

    expect(db.lastOp("request_documents", "insert")?.payload.uploaded_by).toBe(MOI)
  })

  it("refuse un fichier rangé hors du dossier de la demande", async () => {
    setup()
    const res = await POST(makeRequest(corps({ filePath: `requests/${AUTRE}/x.pdf` })))

    expect(res.status).toBe(400)
    expect(db.lastOp("request_documents", "insert")).toBeUndefined()
  })

  it("refuse un chemin qui remonte d'un dossier", async () => {
    setup()
    const res = await POST(makeRequest(corps({ filePath: `requests/${DEMANDE}/../kyc/x.pdf` })))

    expect(res.status).toBe(400)
    expect(db.lastOp("request_documents", "insert")).toBeUndefined()
  })

  it("refuse un chemin aux caractères non autorisés", async () => {
    setup()
    expect((await POST(makeRequest(corps({ filePath: `requests/${DEMANDE}/a b.pdf` })))).status).toBe(400)
  })

  it("refuse une demande que l'appelant ne voit pas", async () => {
    setup({ visible: false })
    const res = await POST(makeRequest(corps()))

    expect(res.status).toBe(403)
    expect(db.lastOp("request_documents", "insert")).toBeUndefined()
  })

  it("enregistre le type seul quand aucun service n'est donné", async () => {
    setup()
    await POST(makeRequest(corps({ service: null })))

    expect(db.lastOp("request_documents", "insert")?.payload.document_type).toBe("BILL_OF_LADING")
  })

  it("demande l'analyse OCR des factures proforma, avec le lien privé", async () => {
    setup()
    await POST(makeRequest(corps({ type: "PROFORMA_INVOICE" })))

    const ocr = sendToN8N.mock.calls.find((c) => c[0] === "ocr_analysis_requested")
    expect(ocr?.[1]).toMatchObject({ fileUrl: expect.stringContaining("/api/files/documents?path=") })
  })
})
