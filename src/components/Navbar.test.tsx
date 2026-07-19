import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import Navbar from "./Navbar"
import { LanguageProvider } from "@/lib/i18n-context"
import type { ReactNode } from "react"

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) =>
    <a href={href} {...props}>{children}</a>,
}))

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ back: vi.fn() }),
}))

function Wrapper({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>
}

describe("Navbar", () => {
  it("renders the logo/brand link", () => {
    render(<Navbar />, { wrapper: Wrapper })
    const links = screen.getAllByRole("link")
    expect(links.length).toBeGreaterThanOrEqual(1)
  })

  it("renders navigation links with translations (desktop + mobile)", () => {
    render(<Navbar />, { wrapper: Wrapper })
    const servicesLinks = screen.getAllByText("Services")
    expect(servicesLinks.length).toBe(2)
    const contactLinks = screen.getAllByText("Contact")
    expect(contactLinks.length).toBe(2)
  })

  it("renders the language switcher (desktop + mobile)", () => {
    render(<Navbar />, { wrapper: Wrapper })
    const comboboxes = screen.getAllByRole("combobox")
    expect(comboboxes.length).toBe(2)
  })
})
