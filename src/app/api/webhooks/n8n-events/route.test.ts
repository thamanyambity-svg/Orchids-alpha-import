import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

/**
 * Réception des événements n8n.
 *
 * Le secret partagé est la seule barrière : la route écrit dans `audit_logs`
 * avec la clé de service, hors de portée de RLS. Elle doit donc échouer fermé
 * dans tous les cas dégradés — secret absent côté serveur compris, faute de
 * quoi un webhook non configuré accepterait tout le monde.
 *
 * Le second risque est le volume. Le corps était écrit tel quel : un appelant
 * détenant le secret pouvait déverser des mégaoctets à chaque appel dans une
 * table de traçabilité qu'on ne peut pas purger sans perdre l'audit.
 */

const insert = vi.fn((_ligne?: unknown) => Promise.resolve({ error: null as any }))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ insert: (l: unknown) => insert(l) }) }),
}))

const { POST } = await import("./route")

const SECRET = "secret-partage-n8n"
const ENV = { ...process.env }

function requete(
  corps: unknown,
  {
    secret = SECRET as string | null,
    url = "https://site.test/api/webhooks/n8n-events",
    entetes = {} as Record<string, string>,
  } = {}
) {
  // `secret: null` retire l'en-tête ; une valeur par défaut le remettrait et
  // le cas « en-tête absent » ne serait jamais éprouvé.
  const tous: Record<string, string> = { ...(secret === null ? {} : { "x-webhook-secret": secret }), ...entetes }
  return {
    url,
    json: async () => corps,
    headers: { get: (k: string) => tous[k.toLowerCase()] ?? null },
  } as any
}

function ligneEcrite() {
  return insert.mock.calls[0]?.[0] as any
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
  vi.spyOn(console, "warn").mockImplementation(() => {})
  process.env.N8N_WEBHOOK_SECRET = SECRET
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projet.supabase.co"
  process.env.SUPABASE_SERVICE_ROLE_KEY = "cle-de-service"
})

afterEach(() => {
  process.env = { ...ENV }
  vi.restoreAllMocks()
})

describe("authentification", () => {
  it("refuse un secret erroné", async () => {
    const res = await POST(requete({ event: "x" }, { secret: "mauvais" }))

    expect(res.status).toBe(401)
    expect(insert).not.toHaveBeenCalled()
  })

  it("refuse une requête sans en-tête de secret", async () => {
    const res = await POST(requete({ event: "x" }, { secret: null }))

    expect(res.status).toBe(401)
    expect(insert).not.toHaveBeenCalled()
  })

  it("échoue fermé quand le secret n'est pas configuré côté serveur", async () => {
    // Sans cette garde, une instance mal configurée accepte n'importe qui.
    delete process.env.N8N_WEBHOOK_SECRET

    const res = await POST(requete({ event: "x" }))

    expect(res.status).toBe(500)
    expect(insert).not.toHaveBeenCalled()
  })
})

describe("écriture dans le journal d'audit", () => {
  it("enregistre l'événement comme action système, sans acteur", async () => {
    // Un acteur inventé ferait porter l'acte à quelqu'un.
    const res = await POST(requete({ event: "quote.sent", data: { id: 1 } }))

    expect(res.status).toBe(200)
    expect(ligneEcrite()).toMatchObject({ actor_id: null, target_type: "n8n_webhook" })
    await expect(res.json()).resolves.toMatchObject({ persisted: true })
  })

  it("préfixe l'action et la met en majuscules", async () => {
    await POST(requete({ event: "x" }, { url: "https://site.test/api/webhooks/n8n-events?action=quote_sent" }))

    expect(ligneEcrite().action).toBe("N8N_QUOTE_SENT")
  })

  it("retire d'une action tout ce qui n'est pas alphanumérique", async () => {
    // Le journal d'audit est une pièce de traçabilité, pas un champ libre.
    await POST(
      requete({ event: "x" }, { url: "https://site.test/api/webhooks/n8n-events?action=a<script>b" })
    )

    expect(ligneEcrite().action).toBe("N8N_ASCRIPTB")
  })

  it("borne la longueur de l'action", async () => {
    await POST(
      requete({ event: "x" }, { url: `https://site.test/api/webhooks/n8n-events?action=${"A".repeat(200)}` })
    )

    expect(ligneEcrite().action.length).toBeLessThanOrEqual(44)
  })

  it("retombe sur LOG quand l'action ne contient rien d'exploitable", async () => {
    await POST(requete({ event: "x" }, { url: "https://site.test/api/webhooks/n8n-events?action=***" }))

    expect(ligneEcrite().action).toBe("N8N_LOG")
  })

  it("borne le nom de l'événement", async () => {
    await POST(requete({ event: "e".repeat(500) }))

    expect(ligneEcrite().details.event.length).toBeLessThanOrEqual(200)
  })

  it("tronque un corps démesuré en disant la taille reçue", async () => {
    // Sans cette borne, la table de traçabilité devient un dépotoir.
    const res = await POST(requete({ event: "gros", data: { charge: "x".repeat(20000) } }))

    expect(res.status).toBe(200)
    expect(ligneEcrite().details).toMatchObject({ tronque: true })
    expect(ligneEcrite().details.taille_recue).toBeGreaterThan(16000)
    expect(JSON.stringify(ligneEcrite().details).length).toBeLessThan(1000)
  })

  it("conserve un corps de taille normale intact", async () => {
    await POST(requete({ event: "normal", data: { commande: "CMD-1" } }))

    expect(ligneEcrite().details.data).toEqual({ commande: "CMD-1" })
    expect(ligneEcrite().details.tronque).toBeUndefined()
  })

  it("accepte la charge imbriquée que produit n8n", async () => {
    // n8n encapsule parfois le corps sous une clé `body`.
    await POST(requete({ body: { event: "imbrique", data: { a: 1 } } }))

    expect(ligneEcrite().details.event).toBe("imbrique")
  })

  it("trace l'adresse d'origine et l'agent", async () => {
    await POST(
      requete({ event: "x" }, { entetes: { "x-forwarded-for": "203.0.113.8", "user-agent": "n8n/1.0" } })
    )

    expect(ligneEcrite()).toMatchObject({ ip_address: "203.0.113.8", user_agent: "n8n/1.0" })
  })
})

describe("dégradation", () => {
  it("annonce que rien n'est tracé quand Supabase n'est pas configuré", async () => {
    // Renvoyer un accusé de réception ordinaire ferait croire à une traçabilité
    // qui n'existe pas.
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    const res = await POST(requete({ event: "x" }))

    expect(res.status).toBe(202)
    await expect(res.json()).resolves.toMatchObject({ persisted: false })
    expect(insert).not.toHaveBeenCalled()
  })

  it("répond 400 sur un corps illisible, après authentification", async () => {
    const res = await POST({
      url: "https://site.test/api/webhooks/n8n-events",
      json: async () => {
        throw new SyntaxError("Unexpected token")
      },
      headers: { get: (k: string) => (k.toLowerCase() === "x-webhook-secret" ? SECRET : null) },
    } as any)

    expect(res.status).toBe(400)
  })
})
