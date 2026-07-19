import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { PaymentButton } from "./payment-button"
import { LanguageProvider } from "@/lib/i18n-context"
import type { ReactNode } from "react"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn() }),
}))

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "user-1" } }, error: null }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { mandate_activated: false }, error: null }),
        }),
      }),
    }),
  }),
}))

function Wrapper({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>
}

describe("PaymentButton", () => {
  const defaultProps = {
    orderId: "order-1",
    paymentType: "DEPOSIT_60" as const,
    amount: 1500,
  }

  it("renders the card payment button when no mandate", async () => {
    render(<PaymentButton {...defaultProps} />, { wrapper: Wrapper })
    expect(await screen.findByText(/Payer par carte/i)).toBeInTheDocument()
  })

  it("renders the button disabled when disabled prop is true", async () => {
    render(<PaymentButton {...defaultProps} disabled />, { wrapper: Wrapper })
    expect(await screen.findByRole("button")).toBeDisabled()
  })

  it("renders the balance label for BALANCE_40", async () => {
    render(<PaymentButton {...defaultProps} paymentType="BALANCE_40" />, { wrapper: Wrapper })
    expect(await screen.findByText(/40%/)).toBeInTheDocument()
  })

  it("renders the deposit label for DEPOSIT_60", async () => {
    render(<PaymentButton {...defaultProps} paymentType="DEPOSIT_60" />, { wrapper: Wrapper })
    expect(await screen.findByText(/60%/)).toBeInTheDocument()
  })
})
