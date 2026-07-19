import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { LanguageSwitcher } from "./language-switcher"
import { LanguageProvider } from "@/lib/i18n-context"
import type { ReactNode } from "react"

function Wrapper({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>
}

describe("LanguageSwitcher", () => {
  it("renders the current language trigger with combobox role", () => {
    render(<LanguageSwitcher />, { wrapper: Wrapper })
    expect(screen.getByRole("combobox")).toBeInTheDocument()
  })

  it("displays Français as default language (sr-only text)", () => {
    render(<LanguageSwitcher />, { wrapper: Wrapper })
    expect(screen.getByText("Français")).toBeInTheDocument()
  })
})
