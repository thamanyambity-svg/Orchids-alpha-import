import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import Services from "./Services"
import { LanguageProvider } from "@/lib/i18n-context"
import type { ReactNode } from "react"

function Wrapper({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>
}

describe("Services", () => {
  it("renders the services section heading", () => {
    render(<Services />, { wrapper: Wrapper })
    const heading = screen.getByRole("heading", { level: 2 })
    expect(heading).toBeInTheDocument()
    expect(heading.textContent).toBeTruthy()
  })

  it("renders service cards", () => {
    render(<Services />, { wrapper: Wrapper })
    const cards = screen.getAllByRole("heading", { level: 3 })
    expect(cards.length).toBeGreaterThanOrEqual(4)
  })
})
