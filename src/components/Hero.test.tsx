import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import Hero from "./Hero"
import { LanguageProvider } from "@/lib/i18n-context"
import type { ReactNode } from "react"

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) =>
    <a href={href} {...props}>{children}</a>,
}))

function Wrapper({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>
}

describe("Hero", () => {
  it("renders the main heading with i18n", () => {
    render(<Hero />, { wrapper: Wrapper })
    const heading = screen.getByRole("heading", { level: 1 })
    expect(heading).toBeInTheDocument()
    expect(heading.textContent).toBeTruthy()
  })

  it("renders CTA buttons", () => {
    render(<Hero />, { wrapper: Wrapper })
    const links = screen.getAllByRole("link")
    expect(links.length).toBeGreaterThanOrEqual(2)
  })
})
