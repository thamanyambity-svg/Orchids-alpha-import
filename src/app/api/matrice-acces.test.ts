import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSupabaseMock, makeRequest } from "@/test-utils/supabase-mock"

/**
 * Matrice d'accès : un compte étranger à un dossier n'obtient jamais rien.
 *
 * C'est le contrôle qu'on ferait à la main avec un outil d'interception —
 * rejouer chaque adresse avec la session de quelqu'un d'autre — mais rejoué à
 * chaque modification du code. Chaque route du dossier est appelée ici avec :
 *  - un acheteur étranger au dossier,
 *  - un partenaire non affecté,
 * et doit répondre 401, 403 ou 404, sans jamais écrire.
 *
 * Toute route de dossier ajoutée plus tard doit être ajoutée ici.
 */

const requireUser = vi.fn()
const requireRole = vi.fn()
let db: ReturnType<typeof createSupabaseMock>

vi.mock("@/lib/auth-guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-guard")>()
  return {
    ...actual,
    requireUser: (...a: any[]) => requireUser(...a),
    requireRole: (...a: any[]) => requireRole(...a),
  }
})
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => db.client }))
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: () => ({ allowed: true }) }))
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn(() => Promise.resolve()) }))
vi.mock("@/lib/webhooks", () => ({ sendToN8N: vi.fn(() => Promise.resolve()) }))
vi.mock("@/components/quotes/proforma-pdf", () => ({ genererProFormaPdf: async () => Buffer.from("%PDF-") }))
vi.mock("@/components/invoices/final-invoice-pdf", () => ({ genererFactureFinalePdf: async () => Buffer.from("%PDF-") }))

const messages = await import("./requests/[id]/messages/route")
const proforma = await import("./requests/[id]/quote/route")
const facture = await import("./requests/[id]/invoice/route")
const decisionProforma = await import("./quotes/[id]/decision/route")
const pdfProforma = await import("./quotes/[id]/pdf/route")
const decisionFacture = await import("./invoices/[id]/decision/route")
const pdfFacture = await import("./invoices/[id]/pdf/route")
const fichiers = await import("./files/[bucket]/route")
const documents = await import("./requests/documents/route")
const { ApiError } = await import("@/lib/auth-guard")

const DEMANDE = "11111111-1111-4111-8111-111111111111"
const QUOTE = "99999999-9999-4999-8999-999999999999"
const FACTURE = "12121212-1212-4212-8212-121212121212"
const ACHETEUR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const PARTENAIRE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const FICHE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const AUTRE_ACHETEUR = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"
const AUTRE_PARTENAIRE = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"

const valeurFiltre = (op: any, colonne: string) => op.filtres.find((f: any) => f.colonne === colonne)?.valeur

/**
 * Base garnie : le dossier existe et appartient à quelqu'un d'autre.
 *
 * Le double de la base respecte les filtres qui portent une décision : la
 * recherche « cette fiche partenaire appartient-elle à ce compte ? » ne
 * répond que pour le partenaire réellement affecté. Sans cela, le banc
 * d'essai validerait des accès que la vraie base refuse.
 */
function base() {
  return createSupabaseMock((op) => {
    if (op.table === "import_requests") {
      return { data: { buyer_id: ACHETEUR, assigned_partner_id: FICHE, status: "ANALYSIS", reference: "AIX-1", product_name: "Volvo" } }
    }
    if (op.table === "partner_profiles") {
      const compte = valeurFiltre(op, "user_id")
      if (compte !== undefined && compte !== PARTENAIRE) return { data: null }
      return { data: { user_id: PARTENAIRE, id: FICHE } }
    }
    if (op.table === "quotes" && op.type === "select") {
      return { data: { id: QUOTE, request_id: DEMANDE, status: "SUBMITTED", version: 1, submitted_at: "2026-09-20T10:00:00Z", currency: "USD", grand_total_usd: 1000, validity_days: 30, lines: [] } }
    }
    if (op.table === "invoices" && op.type === "select") {
      return { data: { id: FACTURE, type: "FINAL", request_id: DEMANDE, order_id: "ord-1", purchase_order_id: "po-1", status: "SENT", number: "FAC-1", lines: [], total_amount: 1000, currency: "USD" } }
    }
    if (op.table === "purchase_orders") return { data: { id: "po-1", po_number: "PO-1", status: "GENERATED", deposit_percent: 60 } }
    if (op.table === "orders") return { data: { id: "ord-1", reference: "PO-1", status: "PENDING" } }
    if (op.table === "profiles") return { data: [{ id: "admin-1" }] }
    return { data: null }
  })
}

/**
 * Client de session : il voit ce que les règles d'accès de la base laissent
 * voir. Un compte étranger au dossier ne lit pas la demande — c'est sur cette
 * lecture que certaines routes fondent leur refus.
 */
function sessionDe(compte: string) {
  const participe = compte === ACHETEUR || compte === PARTENAIRE
  return createSupabaseMock((op) => {
    if (op.table === "import_requests") {
      return { data: participe ? { id: DEMANDE, buyer_id: ACHETEUR, assigned_partner_id: FICHE } : null }
    }
    return { data: null }
  })
}

const ctxDemande = () => ({ params: Promise.resolve({ id: DEMANDE }) })

/** Chaque appel : nom, exécution, et ce qu'il écrirait s'il passait. */
const APPELS: { nom: string; appel: () => Promise<Response>; ecrit?: string }[] = [
  { nom: "lire la discussion", appel: () => messages.GET(makeRequest(null), ctxDemande()) },
  { nom: "écrire dans la discussion", appel: () => messages.POST(makeRequest({ content: "bonjour" }), ctxDemande()), ecrit: "messages" },
  { nom: "lire les pro formas", appel: () => proforma.GET(makeRequest(null), ctxDemande()) },
  {
    nom: "déposer une pro forma",
    appel: () => proforma.POST(makeRequest({ unit_price_usd: 100, quantity: 1 }), ctxDemande()),
    ecrit: "quotes",
  },
  { nom: "lire la facture finale", appel: () => facture.GET(makeRequest(null), ctxDemande()) },
  {
    nom: "établir la facture finale",
    appel: () => facture.PUT(makeRequest({ lines: [{ libelle: "Marchandise", categorie: "MARCHANDISE", montant: 10 }] }), ctxDemande()),
    ecrit: "invoices",
  },
  {
    nom: "décider d'une pro forma",
    appel: () => decisionProforma.POST(makeRequest({ action: "accept" }), { params: Promise.resolve({ id: QUOTE }) }),
    ecrit: "quotes",
  },
  { nom: "ouvrir le PDF d'une pro forma", appel: () => pdfProforma.GET(makeRequest(null), { params: Promise.resolve({ id: QUOTE }) }) },
  {
    nom: "décider d'une facture finale",
    appel: () => decisionFacture.POST(makeRequest({ action: "validate", cgv_accepted: true }), { params: Promise.resolve({ id: FACTURE }) }),
    ecrit: "invoices",
  },
  { nom: "ouvrir le PDF d'une facture", appel: () => pdfFacture.GET(makeRequest(null), { params: Promise.resolve({ id: FACTURE }) }) },
  {
    nom: "ouvrir un fichier du dossier",
    appel: () =>
      fichiers.GET(makeRequest(null, { url: `https://site.test/api/files/documents?path=requests/${DEMANDE}/chat/1.jpg` }), {
        params: Promise.resolve({ bucket: "documents" }),
      }),
  },
  {
    nom: "rattacher un document au dossier",
    appel: () =>
      documents.POST(
        makeRequest({
          requestId: DEMANDE,
          type: "FACTURE",
          filePath: `requests/${DEMANDE}/doc.pdf`,
          fileName: "doc.pdf",
        })
      ),
    ecrit: "request_documents",
  },
]

const INTRUS = [
  { qui: "un acheteur étranger au dossier", id: AUTRE_ACHETEUR, role: "BUYER" },
  { qui: "un partenaire non affecté", id: AUTRE_PARTENAIRE, role: "PARTNER" },
]

describe("matrice d'accès aux dossiers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  for (const intrus of INTRUS) {
    describe(intrus.qui, () => {
      for (const { nom, appel, ecrit } of APPELS) {
        it(`ne peut pas ${nom}`, async () => {
          db = base()
          const session = { user: { id: intrus.id }, role: intrus.role, supabase: sessionDe(intrus.id).client }
          requireUser.mockResolvedValue(session)
          requireRole.mockImplementation(async (roles: string[]) => {
            if (!roles.includes(intrus.role)) throw new ApiError(403, "Forbidden")
            return session
          })

          const res = await appel()

          expect([401, 403, 404], `${nom} a répondu ${res.status}`).toContain(res.status)
          if (ecrit) {
            expect(db.ops.find((o) => o.table === ecrit && o.type !== "select"), `${nom} a écrit dans ${ecrit}`).toBeUndefined()
          }
        })
      }
    })
  }

  describe("visiteur non connecté", () => {
    for (const { nom, appel } of APPELS) {
      it(`ne peut pas ${nom}`, async () => {
        db = base()
        requireUser.mockRejectedValue(new ApiError(401, "Unauthorized"))
        requireRole.mockRejectedValue(new ApiError(401, "Unauthorized"))

        const res = await appel()

        expect([401, 403, 404]).toContain(res.status)
        expect(db.ops.filter((o) => o.type !== "select")).toHaveLength(0)
      })
    }
  })
})
