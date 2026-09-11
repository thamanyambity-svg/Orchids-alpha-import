import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

/**
 * Contrôle d'accès par espace. Chaque renvoi doit dire pourquoi : un
 * administrateur renvoyé en silence de l'espace client vers /admin concluait
 * que l'espace client ne fonctionnait pas.
 */

let utilisateur: { id: string } | null = null
let role: string | null = null

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: utilisateur } }) },
    from: () => {
      const b: any = { select: () => b, eq: () => b, maybeSingle: async () => ({ data: role ? { role } : null }) }
      return b
    },
  }),
}))

const { updateSession } = await import("./middleware")

async function aller(chemin: string) {
  const res = await updateSession(new NextRequest(`https://site.test${chemin}`))
  const lieu = res.headers.get("location")
  return lieu ? new URL(lieu) : null
}

function connecte(r: string | null) {
  utilisateur = { id: "compte-1" }
  role = r
}

describe("updateSession — accès par espace", () => {
  beforeEach(() => {
    utilisateur = null
    role = null
  })

  it("envoie un visiteur vers la connexion, sans message d'erreur", async () => {
    const cible = await aller("/dashboard")
    expect(cible?.pathname).toBe("/login")
    expect(cible?.search).toBe("")
  })

  it("laisse passer un visiteur sur les pages publiques", async () => {
    expect(await aller("/")).toBeNull()
    expect(await aller("/partner-request")).toBeNull()
  })

  it("laisse un client dans son espace", async () => {
    connecte("BUYER")
    expect(await aller("/dashboard/requests/abc")).toBeNull()
  })

  it("renvoie un administrateur de l'espace client vers /admin, en disant pourquoi", async () => {
    connecte("ADMIN")
    const cible = await aller("/dashboard")
    expect(cible?.pathname).toBe("/admin")
    expect(cible?.searchParams.get("refus")).toBe("client")
  })

  it("renvoie un client de l'administration vers son espace, en disant pourquoi", async () => {
    connecte("BUYER")
    const cible = await aller("/admin/requests")
    expect(cible?.pathname).toBe("/dashboard")
    expect(cible?.searchParams.get("refus")).toBe("admin")
  })

  it("renvoie un partenaire de l'espace client vers /partner", async () => {
    connecte("PARTNER")
    const cible = await aller("/dashboard")
    expect(cible?.pathname).toBe("/partner")
    expect(cible?.searchParams.get("refus")).toBe("client")
  })

  it("signale à un compte déjà connecté qui ouvre /login qu'il l'est déjà", async () => {
    connecte("BUYER")
    const cible = await aller("/login")
    expect(cible?.pathname).toBe("/dashboard")
    expect(cible?.searchParams.get("deja")).toBe("1")
  })

  it("ne garde pas les paramètres de la page d'origine dans le renvoi", async () => {
    connecte("ADMIN")
    const cible = await aller("/dashboard?x=1")
    expect(cible?.searchParams.get("x")).toBeNull()
  })

  it("renvoie un compte sans rôle vers la connexion avec la raison, sans boucle", async () => {
    connecte(null)
    const cible = await aller("/dashboard")
    expect(cible?.pathname).toBe("/login")
    expect(cible?.searchParams.get("erreur")).toBe("role")
    // Sur /login lui-même : pas de renvoi, sinon boucle.
    expect(await aller("/login")).toBeNull()
  })
})
