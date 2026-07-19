import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { SepaMandateForm } from "./sepa-mandate-form"
import { LanguageProvider } from "@/lib/i18n-context"
import type { ReactNode } from "react"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn() }),
}))

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: () => Promise.resolve({
    confirmSepaDebitSetup: () => Promise.resolve({ setupIntent: { id: "si_mock" }, error: null }),
  }),
}))

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: null }, error: null }) },
  }),
}))

function Wrapper({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>
}

describe("SepaMandateForm", () => {
  it("renders the form with IBAN, BIC, and name fields", async () => {
    render(<SepaMandateForm />, { wrapper: Wrapper })
    expect(await screen.findByLabelText("Titulaire du compte")).toBeInTheDocument()
    expect(await screen.findByLabelText("IBAN")).toBeInTheDocument()
    expect(await screen.findByLabelText("BIC / SWIFT")).toBeInTheDocument()
  })

  it("renders the submit button", async () => {
    render(<SepaMandateForm />, { wrapper: Wrapper })
    expect(await screen.findByRole("button", { name: /Activer le prélèvement SEPA/i })).toBeInTheDocument()
  })

  it("renders the cancel button when onClose is provided", async () => {
    render(<SepaMandateForm onClose={vi.fn()} />, { wrapper: Wrapper })
    expect(await screen.findByRole("button", { name: /Activer le prélèvement SEPA/i })).toBeInTheDocument()
    expect(await screen.findByRole("button", { name: /Annuler/i })).toBeInTheDocument()
  })

  it("shows the SEPA explanation text", () => {
    render(<SepaMandateForm />, { wrapper: Wrapper })
    expect(screen.getByText("Pourquoi le prélèvement SEPA ?")).toBeInTheDocument()
  })
})
