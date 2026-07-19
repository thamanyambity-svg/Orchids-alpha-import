import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useLanguage, LanguageProvider, languages } from "./i18n-context"
import type { ReactNode } from "react"

function renderUseLanguage() {
  return renderHook(() => useLanguage(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <LanguageProvider>{children}</LanguageProvider>
    ),
  })
}

describe("LanguageProvider", () => {
  it("defaults to French", () => {
    const { result } = renderUseLanguage()
    expect(result.current.language).toBe("fr")
  })

  it("translates existing keys", () => {
    const { result } = renderUseLanguage()
    expect(result.current.t("nav.services", "Services")).toBe("Services")
  })

  it("falls back to defaultText when key is missing", () => {
    const { result } = renderUseLanguage()
    expect(result.current.t("nonexistent.key", "Fallback")).toBe("Fallback")
  })

  it("falls back to key when both key and defaultText missing", () => {
    const { result } = renderUseLanguage()
    expect(result.current.t("unknown.key")).toBe("unknown.key")
  })

  it("switches language and persists to localStorage", () => {
    const { result } = renderUseLanguage()
    act(() => result.current.setLanguage("en"))
    expect(result.current.language).toBe("en")
    expect(localStorage.getItem("app-language")).toBe("en")
  })

  it("updates html lang and dir attributes on switch", () => {
    const { result } = renderUseLanguage()
    act(() => result.current.setLanguage("en"))
    expect(document.documentElement.lang).toBe("en")
    expect(document.documentElement.dir).toBe("ltr")

    act(() => result.current.setLanguage("ar"))
    expect(document.documentElement.lang).toBe("ar")
    expect(document.documentElement.dir).toBe("rtl")
  })

  it("uses different dictionaries per language", () => {
    const { result } = renderUseLanguage()
    act(() => result.current.setLanguage("fr"))
    expect(result.current.t("nav.about")).toContain("Qui")

    act(() => result.current.setLanguage("en"))
    expect(result.current.t("nav.about")).toContain("About")

    act(() => result.current.setLanguage("ar"))
    expect(result.current.t("nav.about")).toContain("نحن")
  })

  it("provides all 6 languages", () => {
    expect(languages).toHaveLength(6)
    const codes = languages.map((l) => l.code)
    expect(codes).toEqual(["fr", "en", "tr", "zh", "ja", "ar"])
  })
})
