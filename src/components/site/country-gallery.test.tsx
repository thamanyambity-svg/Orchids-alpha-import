import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { CountryGallery } from "./country-gallery"

/**
 * Galerie défilante d'un pays.
 *
 * Ce composant ne peut pas être éprouvé dans un navigateur piloté : les rappels
 * d'`IntersectionObserver` ne s'exécutent que si la page est réellement peinte,
 * ce qui n'est pas le cas d'un panneau masqué. Les propriétés sont donc
 * vérifiées ici, avec un observateur simulé et des minuteurs contrôlés.
 *
 * Trois d'entre elles ne se voient pas à l'œil et se perdent facilement à la
 * première refonte : l'arrêt hors champ, le respect de `prefers-reduced-motion`,
 * et le fait de ne monter que deux images à la fois. Ce sont précisément
 * celles-là qui protègent la batterie d'un visiteur sur mobile.
 */

const IMAGES = ["/a.jpg", "/b.jpg", "/c.jpg", "/d.jpg"]

let declencherVisibilite: ((visible: boolean) => void) | null = null
let observateursCrees = 0
let deconnexions = 0

vi.mock("next/image", () => ({
  default: ({ src, className }: { src: string; className?: string }) =>
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    require("react").createElement("img", { src, className, alt: "" }),
}))

function installerObservateur() {
  observateursCrees = 0
  deconnexions = 0
  declencherVisibilite = null
  class FauxObservateur {
    constructor(private rappel: (entrees: { isIntersecting: boolean }[]) => void) {
      observateursCrees++
      declencherVisibilite = (visible: boolean) => this.rappel([{ isIntersecting: visible }])
    }
    observe() {}
    disconnect() {
      deconnexions++
    }
    unobserve() {}
  }
  vi.stubGlobal("IntersectionObserver", FauxObservateur as unknown as typeof IntersectionObserver)
}

function mouvementReduit(reduit: boolean) {
  vi.stubGlobal(
    "matchMedia",
    (requete: string) =>
      ({
        matches: reduit && requete.includes("reduce"),
        media: requete,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList
  )
}

/** Source de l'image actuellement opaque. */
function imageVisible() {
  const visibles = screen.getAllByRole("presentation", { hidden: true }) as HTMLImageElement[]
  return visibles.find((i) => i.className.includes("opacity-70"))?.getAttribute("src") ?? null
}

function imagesMontees() {
  return (screen.getAllByRole("presentation", { hidden: true }) as HTMLImageElement[]).length
}

beforeEach(() => {
  vi.useFakeTimers()
  installerObservateur()
  mouvementReduit(false)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("CountryGallery", () => {
  it("ne monte que l'image courante et la suivante", () => {
    // Quatre images sur cinq pays feraient vingt requêtes pour une section
    // qu'on traverse en défilant.
    render(<CountryGallery images={IMAGES} legende="Chine" />)

    expect(imagesMontees()).toBe(2)
  })

  it("ne défile pas tant que la carte n'est pas à l'écran", () => {
    render(<CountryGallery images={IMAGES} legende="Chine" />)
    const depart = imageVisible()

    act(() => {
      vi.advanceTimersByTime(30_000)
    })

    expect(imageVisible()).toBe(depart)
  })

  it("défile une fois la carte visible", () => {
    render(<CountryGallery images={IMAGES} legende="Chine" />)
    const depart = imageVisible()

    act(() => declencherVisibilite!(true))
    act(() => {
      vi.advanceTimersByTime(6000)
    })

    expect(imageVisible()).not.toBe(depart)
  })

  it("revient à la première image après la dernière", () => {
    render(<CountryGallery images={IMAGES} legende="Chine" />)
    const depart = imageVisible()

    act(() => declencherVisibilite!(true))
    act(() => {
      // Quatre pas complets.
      vi.advanceTimersByTime(4 * 5000 + 100)
    })

    expect(imageVisible()).toBe(depart)
  })

  it("s'arrête quand la carte quitte l'écran", () => {
    // Cinq galeries qui tournent en permanence, dont quatre invisibles,
    // consomment processeur et batterie pour rien.
    render(<CountryGallery images={IMAGES} legende="Chine" />)

    act(() => declencherVisibilite!(true))
    act(() => {
      vi.advanceTimersByTime(5100)
    })
    const avantSortie = imageVisible()

    act(() => declencherVisibilite!(false))

    // Échantillonnage plutôt qu'une comparaison unique : une seule mesure après
    // un long saut peut retomber par hasard sur la même image, le nombre de pas
    // étant un multiple du nombre de vues. Cette version-là laissait passer un
    // minuteur resté actif.
    const vues = new Set<string | null>([avantSortie])
    for (let k = 0; k < 6; k++) {
      act(() => {
        vi.advanceTimersByTime(5100)
      })
      vues.add(imageVisible())
    }

    expect(vues.size).toBe(1)
  })

  it("reprend après un retour à l'écran", () => {
    render(<CountryGallery images={IMAGES} legende="Chine" />)

    act(() => declencherVisibilite!(true))
    act(() => declencherVisibilite!(false))
    const arret = imageVisible()

    act(() => declencherVisibilite!(true))
    act(() => {
      vi.advanceTimersByTime(6000)
    })

    expect(imageVisible()).not.toBe(arret)
  })

  it("respecte le décalage de démarrage", () => {
    // Sans lui les cinq galeries basculent à l'unisson, ce qui se lit comme un
    // clignotement plutôt que comme un défilement.
    render(<CountryGallery images={IMAGES} decalageMs={3000} legende="Chine" />)
    const depart = imageVisible()

    act(() => declencherVisibilite!(true))
    // Le décalage retarde le démarrage du minuteur : le premier changement
    // survient à 3000 + 5000 ms, pas à 5000.
    act(() => {
      vi.advanceTimersByTime(7500)
    })
    expect(imageVisible()).toBe(depart)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(imageVisible()).not.toBe(depart)
  })

  it("n'anime pas quand le visiteur demande moins de mouvement", () => {
    // La règle CSS du site neutralise les transitions mais pas un minuteur :
    // sans ce contrôle, les images sauteraient sans fondu — pire que rien.
    mouvementReduit(true)
    render(<CountryGallery images={IMAGES} legende="Chine" />)
    const depart = imageVisible()

    act(() => {
      vi.advanceTimersByTime(30_000)
    })

    expect(imageVisible()).toBe(depart)
    expect(observateursCrees).toBe(0)
  })

  it("n'installe aucun observateur pour une image unique", () => {
    render(<CountryGallery images={["/seule.jpg"]} legende="Chine" />)

    expect(observateursCrees).toBe(0)
    expect(imagesMontees()).toBe(1)
  })

  it("libère l'observateur au démontage", () => {
    const { unmount } = render(<CountryGallery images={IMAGES} legende="Chine" />)
    act(() => declencherVisibilite!(true))

    unmount()

    expect(deconnexions).toBe(1)
  })

  it("nomme le pays pour un lecteur d'écran, les photos étant décoratives", () => {
    render(<CountryGallery images={IMAGES} legende="Chine" />)

    expect(screen.getByText("Chine")).toBeInTheDocument()
  })
})
