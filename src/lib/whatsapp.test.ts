import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const sendToN8N = vi.fn()
vi.mock("@/lib/webhooks", () => ({ sendToN8N: (...args: any[]) => sendToN8N(...args) }))

const { sendWhatsApp, resolveTransport } = await import("./whatsapp")

describe("resolveTransport", () => {
  afterEach(() => {
    delete process.env.WHATSAPP_TRANSPORT
  })

  it("retombe sur 'link' quand rien n'est configuré", () => {
    expect(resolveTransport()).toBe("link")
  })

  it("retombe sur 'link' quand la valeur est inconnue", () => {
    process.env.WHATSAPP_TRANSPORT = "pigeon"
    expect(resolveTransport()).toBe("link")
  })

  it("respecte une valeur reconnue", () => {
    process.env.WHATSAPP_TRANSPORT = "n8n"
    expect(resolveTransport()).toBe("n8n")
  })
})

describe("sendWhatsApp", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.WHATSAPP_TRANSPORT
  })

  it("en mode link, n'envoie rien et renvoie le lien", async () => {
    const result = await sendWhatsApp({
      to: "+8613812345678",
      message: "Nouvelle demande",
      event: "request_assigned",
    })

    expect(sendToN8N).not.toHaveBeenCalled()
    expect(result).toEqual({
      delivered: false,
      link: "https://wa.me/8613812345678?text=Nouvelle%20demande",
    })
  })

  it("en mode n8n, émet l'évènement", async () => {
    process.env.WHATSAPP_TRANSPORT = "n8n"

    const result = await sendWhatsApp({
      to: "+8613812345678",
      message: "Nouvelle demande",
      event: "request_assigned",
    })

    expect(sendToN8N).toHaveBeenCalledWith("whatsapp:request_assigned", {
      to: "+8613812345678",
      message: "Nouvelle demande",
    })
    expect(result.delivered).toBe(true)
  })

  it("refuse un numéro non exploitable sans lever", async () => {
    const result = await sendWhatsApp({ to: "0532 123", message: "x", event: "e" })
    expect(result).toEqual({ delivered: false, link: null, error: "invalid_number" })
  })

  // Une notification qui échoue ne doit jamais annuler l'opération métier qui l'a
  // déclenchée : un devis soumis reste soumis même si WhatsApp est injoignable.
  it("absorbe l'échec du transport sans lever", async () => {
    process.env.WHATSAPP_TRANSPORT = "n8n"
    sendToN8N.mockRejectedValueOnce(new Error("n8n down"))

    const result = await sendWhatsApp({ to: "+8613812345678", message: "x", event: "e" })

    expect(result.delivered).toBe(false)
    expect(result.error).toBe("transport_failed")
  })

  it("signale un transport 'cloud' sélectionné mais non configuré", async () => {
    process.env.WHATSAPP_TRANSPORT = "cloud"

    const result = await sendWhatsApp({ to: "+8613812345678", message: "x", event: "e" })

    expect(result.delivered).toBe(false)
    expect(result.error).toBe("transport_unavailable")
  })
})
