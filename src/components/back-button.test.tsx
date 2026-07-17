import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { BackButton } from "./back-button"
import { LanguageProvider } from "@/lib/i18n-context"
import type { ReactNode } from "react"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn() }),
}))

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) =>
    <a href={href} {...props}>{children}</a>,
}))

function Wrapper({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>
}

describe("BackButton", () => {
  it("renders with default translated label", () => {
    render(<BackButton href="/" />, { wrapper: Wrapper })
    expect(screen.getByText("Retour")).toBeInTheDocument()
  })

  it("renders with custom label", () => {
    render(<BackButton href="/about" label="Custom" />, { wrapper: Wrapper })
    expect(screen.getByText("Custom")).toBeInTheDocument()
  })

  it("renders as a link to the given href", () => {
    render(<BackButton href="/test" />, { wrapper: Wrapper })
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/test")
  })
})
