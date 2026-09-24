import { describe, it, expect } from "vitest"
import { journal } from "./log-sain"

// Les caractères de contrôle sont construits par leur code : les écrire
// littéralement dans ce fichier les y laisserait invisibles.
const CR = String.fromCharCode(13)
const LF = String.fromCharCode(10)
const TAB = String.fromCharCode(9)
const NUL = String.fromCharCode(0)
const DEL = String.fromCharCode(127)

describe("journal", () => {
  it("empêche d'insérer une fausse ligne de journal", () => {
    const forge = `client@test.cd${LF}[admin] suppression du dossier confirmée`
    expect(journal(forge)).toBe("client@test.cd [admin] suppression du dossier confirmée")
    expect(journal(forge)).not.toContain(LF)
  })

  it("retire tous les caractères de contrôle, pas seulement le saut de ligne", () => {
    // Chaque caractère de contrôle devient un espace, un par un.
    expect(journal(`a${CR}${LF}${TAB}b${NUL}c${DEL}d`)).toBe("a   b c d")
  })

  it("borne la longueur", () => {
    const long = journal("x".repeat(500))
    expect(long).toHaveLength(201)
    expect(long.endsWith("…")).toBe(true)
    expect(journal("x".repeat(500), 10)).toBe(`${"x".repeat(10)}…`)
  })

  it("accepte une erreur, un objet, une valeur absente", () => {
    expect(journal(new Error(`échec${LF}ligne forgée`))).toBe("échec ligne forgée")
    expect(journal({ a: 1 })).toBe('{"a":1}')
    expect(journal(null)).toBe("null")
    expect(journal(undefined)).toBe("undefined")
  })

  it("laisse intacte une valeur ordinaire", () => {
    expect(journal("AIX-20260911-2496")).toBe("AIX-20260911-2496")
  })
})
