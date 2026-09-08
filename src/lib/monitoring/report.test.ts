import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

/**
 * Rapport d'incident.
 *
 * Le comportement le plus important n'est pas l'écriture réussie : c'est ce
 * qui se passe quand tout va mal. Une supervision qui lève, qui boucle ou qui
 * bloque transforme une erreur récupérable en panne, et c'est précisément au
 * pire moment qu'elle serait sollicitée.
 */

const rpc = vi.fn()

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: (...a: any[]) => rpc(...a) }),
}))

const { reportError, empreinte, normaliserMessage } = await import("./report")

const ENV_ORIGINE = { ...process.env }

function configurer(env: Record<string, string | undefined>) {
  Object.assign(process.env, {
    NEXT_PUBLIC_SUPABASE_URL: "https://projet.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "cle-de-service",
    VERCEL_ENV: "production",
    ...env,
  })
}

function chargeRpc() {
  return rpc.mock.calls[0]?.[1] as Record<string, any>
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "error").mockImplementation(() => {})
  rpc.mockResolvedValue({ error: null })
  configurer({})
})

afterEach(() => {
  process.env = { ...ENV_ORIGINE }
  vi.restoreAllMocks()
})

describe("normaliserMessage", () => {
  it("efface les identifiants variables pour regrouper le même défaut", () => {
    const a = normaliserMessage("Commande 3f2a1b4c-0000-4000-8000-aaaaaaaaaaaa introuvable")
    const b = normaliserMessage("Commande 91bc7d2e-1111-4111-8111-bbbbbbbbbbbb introuvable")
    expect(a).toBe(b)
  })

  it("efface les nombres et les littéraux entre guillemets", () => {
    expect(normaliserMessage("timeout after 3000ms on 'orders'")).toBe(
      normaliserMessage("timeout after 500ms on 'invoices'")
    )
  })

  it("garde distincts deux messages réellement différents", () => {
    expect(normaliserMessage("commande introuvable")).not.toBe(
      normaliserMessage("facture introuvable")
    )
  })
})

describe("empreinte", () => {
  it("regroupe deux occurrences du même défaut sur la même route", () => {
    expect(empreinte("TypeError", "x de <uuid> nul", "api", "/api/orders")).toBe(
      empreinte("TypeError", "x de 3f2a1b4c-0000-4000-8000-aaaaaaaaaaaa nul", "api", "/api/orders")
    )
  })

  it("sépare le même type d'erreur survenu sur deux routes", () => {
    // Presque toujours deux défauts distincts : les confondre en cache un.
    expect(empreinte("TypeError", "même message", "api", "/api/orders")).not.toBe(
      empreinte("TypeError", "même message", "api", "/api/invoices")
    )
  })

  it("sépare deux types d'erreur au même endroit", () => {
    expect(empreinte("TypeError", "m", "api", "/a")).not.toBe(
      empreinte("RangeError", "m", "api", "/a")
    )
  })
})

describe("reportError — écriture", () => {
  it("enregistre l'incident via la fonction de regroupement", async () => {
    const res = await reportError(new TypeError("échec de lecture"), {
      source: "api",
      route: "/api/orders",
      method: "POST",
      status: 500,
    })

    expect(res.enregistre).toBe(true)
    expect(rpc).toHaveBeenCalledWith("record_error_event", expect.any(Object))
    expect(chargeRpc()).toMatchObject({
      p_name: "TypeError",
      p_source: "api",
      p_route: "/api/orders",
      p_method: "POST",
      p_status: 500,
    })
  })

  it("n'écrit jamais un secret, même passé en contexte", async () => {
    await reportError(new Error("clé sk_live_ABCDEFGH12345678 refusée"), {
      extra: { iban: "FR7630006000011234567890189", authorization: "Bearer zzz123456789" },
    })

    const tout = JSON.stringify(chargeRpc())
    expect(tout).not.toContain("ABCDEFGH12345678")
    expect(tout).not.toContain("FR7630006000011234567890189")
    expect(tout).not.toContain("zzz123456789")
  })

  it("marque la version déployée pour distinguer une régression d'un vieux défaut", async () => {
    configurer({ VERCEL_GIT_COMMIT_SHA: "1ac9d19abcdef0123456" })

    await reportError(new Error("x"))

    expect(chargeRpc().p_release).toBe("1ac9d19abcde")
  })

  it("borne les champs que l'appelant contrôle", async () => {
    await reportError(new Error("x"), {
      route: "/api/" + "a".repeat(500),
      method: "M".repeat(50),
    })

    expect(chargeRpc().p_route.length).toBeLessThanOrEqual(200)
    expect(chargeRpc().p_method.length).toBeLessThanOrEqual(10)
  })

  it("transporte le digest, seul lien entre le support et l'incident", async () => {
    // C'est l'identifiant affiché à l'utilisateur sur la page 500.
    await reportError(new Error("x"), { digest: "3641827394" })
    expect(chargeRpc().p_digest).toBe("3641827394")
  })
})

describe("reportError — dégradation", () => {
  it("ne lève pas et n'écrit pas quand Supabase n'est pas configuré", async () => {
    configurer({ SUPABASE_SERVICE_ROLE_KEY: undefined })

    const res = await reportError(new Error("x"))

    expect(res.enregistre).toBe(false)
    expect(res.raison).toMatch(/supabase/i)
    expect(rpc).not.toHaveBeenCalled()
  })

  it("ne pollue pas la base de production avec les erreurs d'un poste de travail", async () => {
    configurer({ VERCEL_ENV: undefined, NODE_ENV: "development" })

    const res = await reportError(new Error("x"))

    expect(res.enregistre).toBe(false)
    expect(rpc).not.toHaveBeenCalled()
  })

  it("ne lève pas quand la base refuse l'écriture", async () => {
    rpc.mockResolvedValue({ error: { message: "permission denied" } })

    const res = await reportError(new Error("x"))

    expect(res.enregistre).toBe(false)
    expect(res.raison).toMatch(/refusée/)
  })

  it("ne boucle pas quand l'écriture échoue — un seul appel, pas de rapport du rapport", async () => {
    rpc.mockResolvedValue({ error: { message: "permission denied" } })

    await reportError(new Error("x"))

    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it("ne lève pas quand le client Supabase explose lui-même", async () => {
    rpc.mockRejectedValue(new Error("réseau injoignable"))

    await expect(reportError(new Error("x"))).resolves.toMatchObject({ enregistre: false })
  })

  it("accepte ce qui n'est pas une Error sans lever", async () => {
    for (const valeur of [null, undefined, "panne", 42, { code: 500 }]) {
      await expect(reportError(valeur)).resolves.toBeDefined()
    }
  })

  it("écrit toujours dans la console, même quand la base est indisponible", async () => {
    // La console est la seule sortie qui existe en toutes circonstances.
    const espion = vi.spyOn(console, "error")
    configurer({ SUPABASE_SERVICE_ROLE_KEY: undefined })

    await reportError(new Error("visible malgré tout"))

    expect(espion.mock.calls.flat().join(" ")).toContain("[incident]")
  })
})
