import { describe, it, expect } from "vitest"
import { normalizeE164, isE164, waMeLink } from "./phone"

describe("normalizeE164", () => {
  it("accepte un numéro déjà canonique", () => {
    expect(normalizeE164("+8613812345678")).toBe("+8613812345678")
  })

  it("retire les espaces, points, tirets et parenthèses", () => {
    expect(normalizeE164("+971 50 (825) 31-90")).toBe("+971508253190")
  })

  it("convertit le préfixe 00 en +", () => {
    expect(normalizeE164("0090 532 123 45 67")).toBe("+905321234567")
  })

  it("renvoie null si aucun indicatif international n'est fourni", () => {
    expect(normalizeE164("0532 123 45 67")).toBeNull()
  })

  it("renvoie null sur une entrée vide ou absurde", () => {
    expect(normalizeE164("")).toBeNull()
    expect(normalizeE164("téléphone")).toBeNull()
    expect(normalizeE164("+0123456789")).toBeNull()
  })
})

describe("isE164", () => {
  it("valide la forme canonique", () => {
    expect(isE164("+243818924674")).toBe(true)
    expect(isE164("243818924674")).toBe(false)
    expect(isE164("+12")).toBe(false)
  })
})

describe("waMeLink", () => {
  it("construit le lien sans le plus et encode le message", () => {
    expect(waMeLink("+8613812345678", "Demande AIX-1 à traiter")).toBe(
      "https://wa.me/8613812345678?text=Demande%20AIX-1%20%C3%A0%20traiter"
    )
  })

  it("omet le paramètre text quand aucun message n'est fourni", () => {
    expect(waMeLink("+8613812345678")).toBe("https://wa.me/8613812345678")
  })

  it("renvoie null si le numéro n'est pas exploitable", () => {
    expect(waMeLink("0532 123 45 67")).toBeNull()
  })
})
