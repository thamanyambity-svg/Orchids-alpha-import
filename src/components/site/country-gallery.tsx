"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"

/**
 * Galerie défilante d'un pays d'origine.
 *
 * Une photographie fixe par pays disait peu d'un territoire ; plusieurs vues
 * qui se succèdent en montrent la diversité. Trois contraintes encadrent
 * l'animation, et chacune répond à un défaut courant de ce genre de composant.
 *
 * 1. Elle s'arrête hors champ. Cinq galeries qui tournent en permanence, dont
 *    quatre invisibles, consomment du processeur et de la batterie pour rien —
 *    et sur mobile cela se voit. Un observateur d'intersection suspend le
 *    minuteur dès que la carte quitte l'écran.
 *
 * 2. Elle respecte `prefers-reduced-motion`. La règle CSS du site neutralise
 *    les transitions, mais pas un minuteur JavaScript : sans ce contrôle
 *    explicite, les images continueraient de sauter sans fondu, ce qui est pire
 *    que de ne pas animer du tout.
 *
 * 3. Elle ne charge que deux images à la fois. Rendre les quatre d'un coup, sur
 *    cinq pays, représente une vingtaine de requêtes d'images pour une section
 *    que le visiteur parcourt en défilant. Seules l'image courante et la
 *    suivante sont montées — la suivante servant de préchargement, pour que le
 *    fondu n'ait jamais à attendre le réseau.
 */

/** Durée d'affichage d'une vue. Assez long pour être regardé, pas pour lasser. */
const DUREE_MS = 5000

interface Props {
  images: readonly string[]
  /** Décalage au démarrage : sans lui, les cinq galeries basculent à l'unisson. */
  decalageMs?: number
  legende: string
}

export function CountryGallery({ images, decalageMs = 0, legende }: Props) {
  const [index, setIndex] = useState(0)
  const conteneur = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (images.length < 2) return
    if (typeof window === "undefined") return

    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (reduit.matches) return

    const noeud = conteneur.current
    if (!noeud) return

    let minuteur: ReturnType<typeof setInterval> | undefined
    let demarrage: ReturnType<typeof setTimeout> | undefined

    const demarrer = () => {
      demarrage = setTimeout(() => {
        minuteur = setInterval(() => setIndex((i) => (i + 1) % images.length), DUREE_MS)
      }, decalageMs)
    }

    const arreter = () => {
      if (demarrage) clearTimeout(demarrage)
      if (minuteur) clearInterval(minuteur)
      demarrage = undefined
      minuteur = undefined
    }

    const observateur = new IntersectionObserver(
      ([entree]) => (entree.isIntersecting ? demarrer() : arreter()),
      // 25 % suffit : la carte est haute, attendre sa visibilité entière
      // retarderait le démarrage jusqu'à ce que le visiteur soit déjà passé.
      { threshold: 0.25 }
    )
    observateur.observe(noeud)

    return () => {
      observateur.disconnect()
      arreter()
    }
  }, [images.length, decalageMs])

  const suivant = (index + 1) % images.length

  return (
    <div ref={conteneur} className="relative min-h-[280px] overflow-hidden bg-[var(--navy)] md:min-h-[340px]">
      {images.map((src, i) => {
        // Seules la vue courante et la suivante existent dans le document.
        if (i !== index && i !== suivant) return null
        return (
          <Image
            key={src}
            src={src}
            alt=""
            aria-hidden
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className={`object-cover transition-opacity duration-[1200ms] ease-in-out ${
              i === index ? "opacity-70" : "opacity-0"
            }`}
          />
        )
      })}

      {/* Voile dégradé : le texte voisin doit rester lisible quelle que soit
          la photographie affichée à cet instant. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--navy)] via-transparent to-transparent" />

      {images.length > 1 && (
        <div
          className="pointer-events-none absolute bottom-5 end-6 flex gap-[6px]"
          // Indication décorative : la légende est déjà donnée par le bloc voisin.
          aria-hidden
        >
          {images.map((src, i) => (
            <span
              key={src}
              className={`block h-[3px] transition-all duration-500 ${
                i === index ? "w-5 bg-gold" : "w-[10px] bg-foreground/25"
              }`}
            />
          ))}
        </div>
      )}

      {/* Les photographies sont décoratives : la seule information utile à un
          lecteur d'écran est le pays, donnée ici une fois. */}
      <span className="sr-only">{legende}</span>
    </div>
  )
}
