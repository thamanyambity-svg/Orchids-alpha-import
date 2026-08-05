"use client"

import { useEffect, useState } from "react"

/**
 * Révélation au défilement.
 *
 * Chaque élément portant `data-reveal` démarre transparent et décalé, puis
 * remonte quand il entre dans le champ. On observe une seule fois par élément :
 * revenir en arrière ne rejoue pas l'animation, ce qui serait fatigant sur une
 * page longue.
 *
 * Sous `prefers-reduced-motion`, on saute l'animation entièrement plutôt que de
 * la raccourcir : l'élément est visible d'emblée, sans transition.
 */
export function useReveal(deps: unknown[] = []) {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"))
    if (!nodes.length) return

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) {
      nodes.forEach((n) => {
        n.style.opacity = "1"
        n.style.transform = "none"
      })
      return
    }

    nodes.forEach((n) => {
      if (n.dataset.revealed) return
      n.style.opacity = "0"
      n.style.transform = "translateY(34px)"
      n.style.transition =
        "opacity .85s cubic-bezier(.16,1,.3,1), transform .85s cubic-bezier(.16,1,.3,1)"
    })

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const node = entry.target as HTMLElement
          node.dataset.revealed = "1"
          node.style.opacity = "1"
          node.style.transform = "translateY(0)"
          observer.unobserve(node)
        })
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    )

    nodes.forEach((n) => {
      if (!n.dataset.revealed) observer.observe(n)
    })

    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/**
 * Compteurs qui montent quand la section entre dans le champ.
 *
 * Retourne les valeurs courantes. L'animation ne part qu'une fois, à la première
 * intersection : relancer à chaque passage rendrait les chiffres instables.
 */
export function useCountUp(targets: number[], ref: React.RefObject<HTMLElement | null>) {
  const [values, setValues] = useStateArray(targets.length)

  useEffect(() => {
    const host = ref.current
    if (!host) return

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) {
      setValues(targets)
      return
    }

    let frame = 0
    let started = false

    const observer = new IntersectionObserver(
      (entries) => {
        if (started || !entries.some((e) => e.isIntersecting)) return
        started = true

        const duration = 1600
        const start = performance.now()

        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / duration)
          // Sortie cubique : rapide au début, se pose doucement sur la valeur.
          const eased = 1 - Math.pow(1 - p, 3)
          setValues(targets.map((v) => Math.round(v * eased)))
          if (p < 1) frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
      },
      { threshold: 0.25 }
    )

    observer.observe(host)
    return () => {
      observer.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])

  return values
}

function useStateArray(length: number) {
  return useState<number[]>(() => new Array(length).fill(0))
}
