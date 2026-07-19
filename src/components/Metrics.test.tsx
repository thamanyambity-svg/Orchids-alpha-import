import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import Metrics from "./Metrics"
import { LanguageProvider } from "@/lib/i18n-context"
import type { ReactNode } from "react"

function Wrapper({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>
}

describe("Metrics", () => {
  it("renders stat values", () => {
    render(<Metrics />, { wrapper: Wrapper })
    expect(screen.getByText("$2.4B+")).toBeInTheDocument()
    expect(screen.getByText("47")).toBeInTheDocument()
    expect(screen.getByText("1 200+")).toBeInTheDocument()
    expect(screen.getByText("99.2%")).toBeInTheDocument()
  })

  it("renders the section title", () => {
    render(<Metrics />, { wrapper: Wrapper })
    const sectionTitle = screen.getByRole("heading", { level: 2 })
    expect(sectionTitle).toBeInTheDocument()
  })

  it("renders stat labels with i18n", () => {
    render(<Metrics />, { wrapper: Wrapper })
    expect(screen.getByText("Marchandises déplacées")).toBeInTheDocument()
    expect(screen.getByText("Pays partenaires")).toBeInTheDocument()
  })
})
