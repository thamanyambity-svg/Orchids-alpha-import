import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const exchangeCodeForSession = vi.fn()

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { exchangeCodeForSession } }),
}))

const { GET } = await import("./route")

function request(query: string) {
  return new NextRequest(`https://app.example.com/auth/callback${query}`)
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    exchangeCodeForSession.mockResolvedValue({ error: null })
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key"
  })

  it("échange le code et redirige vers le chemin demandé", async () => {
    const res = await GET(request("?code=abc&next=%2Fauth%2Freset-password"))

    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc")
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe("https://app.example.com/auth/reset-password")
  })

  it("redirige vers la racine quand `next` est absent", async () => {
    const res = await GET(request("?code=abc"))

    expect(res.headers.get("location")).toBe("https://app.example.com/")
  })

  it("refuse une redirection vers un domaine externe", async () => {
    const res = await GET(request("?code=abc&next=https%3A%2F%2Fevil.example.com%2Fsteal"))

    expect(res.headers.get("location")).toBe("https://app.example.com/")
  })

  it("refuse une redirection protocol-relative", async () => {
    const res = await GET(request("?code=abc&next=%2F%2Fevil.example.com"))

    expect(res.headers.get("location")).toBe("https://app.example.com/")
  })

  it("renvoie vers /login quand le code est absent", async () => {
    const res = await GET(request(""))

    expect(exchangeCodeForSession).not.toHaveBeenCalled()
    expect(res.headers.get("location")).toBe("https://app.example.com/login?error=auth-missing-code")
  })

  it("renvoie vers /login quand l'échange échoue", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: "expired" } })
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})

    const res = await GET(request("?code=expired&next=%2Fauth%2Freset-password"))

    expect(res.headers.get("location")).toBe("https://app.example.com/login?error=auth-callback")
    spy.mockRestore()
  })
})
