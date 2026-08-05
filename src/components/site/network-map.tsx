"use client"

import { useEffect, useRef } from "react"
import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from "d3-geo"
import { select } from "d3-selection"
import { feature } from "topojson-client"
import type { Topology, GeometryCollection } from "topojson-specification"

const GOLD = "hsl(42 85% 55%)"

/** Kinshasa : point d'arrivée de tous les corridors. */
const HUB = { name: "Kinshasa", lon: 15.31, lat: -4.32 }

const CITIES = [
  { name: "Shanghai", lon: 121.47, lat: 31.23, label: true },
  { name: "Guangzhou", lon: 113.26, lat: 23.13, label: true },
  { name: "Shenzhen", lon: 114.06, lat: 22.55, label: false },
  { name: "Tokyo", lon: 139.69, lat: 35.69, label: true },
  { name: "Osaka", lon: 135.5, lat: 34.69, label: false },
  { name: "Istanbul", lon: 28.98, lat: 41.01, label: true },
  { name: "Izmir", lon: 27.14, lat: 38.42, label: false },
  { name: "Bangkok", lon: 100.5, lat: 13.76, label: true },
  { name: "Dubaï", lon: 55.27, lat: 25.2, label: true },
  { name: "Lubumbashi", lon: 27.48, lat: -11.66, label: true },
  { name: "Matadi", lon: 13.46, lat: -5.82, label: false },
]

/** Ville d'origine et retard d'animation, pour que les corridors ne partent pas ensemble. */
const ROUTES: [string, number][] = [
  ["Shanghai", 0],
  ["Guangzhou", 0.6],
  ["Shenzhen", 1.2],
  ["Tokyo", 1.8],
  ["Osaka", 2.4],
  ["Istanbul", 3.0],
  ["Izmir", 3.6],
  ["Bangkok", 4.2],
  ["Dubaï", 4.8],
]

/**
 * Carte du réseau : projection Natural Earth, corridors animés des pays
 * d'origine vers Kinshasa.
 *
 * Le fond de carte est servi depuis `/geo/countries-110m.json`, vendorisé
 * depuis le paquet `world-atlas`. La maquette le chargeait depuis un CDN, ce que
 * la CSP du projet (`connect-src 'self' …`) refuse — et une dépendance réseau
 * externe ferait disparaître la carte au moindre incident CDN.
 *
 * Le rendu est repris à chaque redimensionnement : la projection est calculée
 * pour des dimensions précises, un simple `viewBox` élastique déformerait les
 * libellés.
 */
export function NetworkMap({ className = "" }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let cancelled = false
    let topo: Topology | null = null
    let resizeTimer: number | undefined

    const draw = () => {
      if (cancelled || !topo || !host) return

      const width = host.clientWidth || 1200
      const height = host.clientHeight || 600
      if (width < 40 || height < 40) return

      select(host).selectAll("svg").remove()

      const countries = feature(
        topo,
        topo.objects.countries as GeometryCollection
      ) as unknown as GeoPermissibleObjects

      const projection = geoNaturalEarth1().fitExtent(
        [
          [16, 26],
          [width - 16, height - 26],
        ],
        countries
      )
      const path = geoPath(projection)

      const svg = select(host)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("role", "img")
        .attr("aria-label", "Corridors d'importation vers Kinshasa")

      const defs = svg.append("defs")
      const glow = defs
        .append("filter")
        .attr("id", "aw-glow")
        .attr("x", "-80%")
        .attr("y", "-80%")
        .attr("width", "260%")
        .attr("height", "260%")
      glow.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "b")
      const merge = glow.append("feMerge")
      merge.append("feMergeNode").attr("in", "b")
      merge.append("feMergeNode").attr("in", "SourceGraphic")

      // Fond : pays en aplat sombre, frontières à peine visibles.
      svg
        .append("g")
        .selectAll("path")
        .data((countries as unknown as { features: unknown[] }).features)
        .join("path")
        .attr("d", path as never)
        .attr("fill", "hsl(216 34% 13%)")
        .attr("stroke", "hsl(216 30% 18%)")
        .attr("stroke-width", 0.5)

      const project = (lon: number, lat: number) => projection([lon, lat])
      const hubPoint = project(HUB.lon, HUB.lat)
      if (!hubPoint) return

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

      // Corridors : arc léger vers le hub, avec un trait lumineux qui le parcourt.
      const routeLayer = svg.append("g")
      ROUTES.forEach(([cityName, delay]) => {
        const city = CITIES.find((c) => c.name === cityName)
        if (!city) return
        const from = project(city.lon, city.lat)
        if (!from) return

        const midX = (from[0] + hubPoint[0]) / 2
        const midY = (from[1] + hubPoint[1]) / 2 - Math.abs(from[0] - hubPoint[0]) * 0.16
        const d = `M${from[0]},${from[1]} Q${midX},${midY} ${hubPoint[0]},${hubPoint[1]}`

        routeLayer
          .append("path")
          .attr("d", d)
          .attr("fill", "none")
          .attr("stroke", "hsl(42 85% 55% / .28)")
          .attr("stroke-width", 1)

        if (reduced) return

        const runner = routeLayer
          .append("path")
          .attr("d", d)
          .attr("fill", "none")
          .attr("stroke", GOLD)
          .attr("stroke-width", 1.6)
          .attr("filter", "url(#aw-glow)")

        const length = (runner.node() as SVGPathElement).getTotalLength()
        runner
          .attr("stroke-dasharray", `${length * 0.12} ${length}`)
          .attr("stroke-dashoffset", length)
          .style("animation", `awDash 5.4s linear ${delay}s infinite`)
      })

      // Une seule règle d'animation, injectée une fois : d3 ne pose pas de
      // keyframes et la valeur dépend de la longueur du tracé.
      if (!reduced && !document.getElementById("aw-dash-style")) {
        const style = document.createElement("style")
        style.id = "aw-dash-style"
        style.textContent = "@keyframes awDash{to{stroke-dashoffset:0}}"
        document.head.appendChild(style)
      }

      // Villes d'origine.
      const cityLayer = svg.append("g")
      CITIES.forEach((city, index) => {
        const point = project(city.lon, city.lat)
        if (!point) return

        cityLayer
          .append("circle")
          .attr("cx", point[0])
          .attr("cy", point[1])
          .attr("r", 3)
          .attr("fill", GOLD)
          .attr("opacity", reduced ? 1 : 0)
          .style(
            "animation",
            reduced ? "none" : `awPop .5s cubic-bezier(.16,1,.3,1) ${0.3 + index * 0.08}s both`
          )

        if (city.label) {
          cityLayer
            .append("text")
            .attr("x", point[0] + 8)
            .attr("y", point[1] + 4)
            .attr("fill", "rgba(255,255,255,.55)")
            .attr("font-family", "'Barlow Condensed', sans-serif")
            .attr("font-size", 11)
            .attr("letter-spacing", "0.16em")
            .text(city.name.toUpperCase())
        }
      })

      // Le hub est plus gros, avec un halo pulsant.
      const hubLayer = svg.append("g")
      if (!reduced) {
        hubLayer
          .append("circle")
          .attr("cx", hubPoint[0])
          .attr("cy", hubPoint[1])
          .attr("r", 5)
          .attr("fill", "none")
          .attr("stroke", GOLD)
          .attr("stroke-width", 1)
          .style("animation", "pulse-ring 2.4s ease-out infinite")
      }
      hubLayer
        .append("circle")
        .attr("cx", hubPoint[0])
        .attr("cy", hubPoint[1])
        .attr("r", 5.5)
        .attr("fill", GOLD)
        .attr("filter", "url(#aw-glow)")
      hubLayer
        .append("text")
        .attr("x", hubPoint[0] + 11)
        .attr("y", hubPoint[1] + 4)
        .attr("fill", "#fff")
        .attr("font-family", "'Bebas Neue', sans-serif")
        .attr("font-size", 15)
        .attr("letter-spacing", "0.08em")
        .text("KINSHASA")
    }

    fetch("/geo/countries-110m.json")
      .then((res) => {
        if (!res.ok) throw new Error(`fond de carte indisponible (${res.status})`)
        return res.json()
      })
      .then((data: Topology) => {
        if (cancelled) return
        topo = data
        draw()
      })
      .catch((error) => {
        // Une carte absente ne doit pas casser la page : on laisse le cadre vide.
        console.warn("[network-map]", error?.message)
      })

    const onResize = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(draw, 180)
    }
    window.addEventListener("resize", onResize)

    return () => {
      cancelled = true
      window.clearTimeout(resizeTimer)
      window.removeEventListener("resize", onResize)
      if (host) select(host).selectAll("svg").remove()
    }
  }, [])

  return <div ref={hostRef} className={`block h-full w-full ${className}`} />
}
