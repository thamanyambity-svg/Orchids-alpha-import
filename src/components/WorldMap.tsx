"use client"

import { useEffect, useRef, useMemo } from "react"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n-context"

export default function WorldMap() {
  const { t } = useLanguage()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const nodes = useMemo(() => [
    { x: 0.82, y: 0.35, label: t("worldmap.city.shanghai", "Shanghai"), radius: 4 },
    { x: 0.78, y: 0.30, label: t("worldmap.city.guangzhou", "Guangzhou"), radius: 4 },
    { x: 0.78, y: 0.38, label: t("worldmap.city.shenzhen", "Shenzhen"), radius: 4 },
    { x: 0.52, y: 0.38, label: t("worldmap.city.istanbul", "Istanbul"), radius: 3 },
    { x: 0.55, y: 0.46, label: t("worldmap.city.dubai", "Dubai"), radius: 3 },
    { x: 0.90, y: 0.33, label: t("worldmap.city.tokyo", "Tokyo"), radius: 3 },
    { x: 0.85, y: 0.40, label: t("worldmap.city.bangkok", "Bangkok"), radius: 3 },
    { x: 0.51, y: 0.58, label: t("worldmap.city.kinshasa", "Kinshasa"), radius: 5 },
    { x: 0.49, y: 0.62, label: t("worldmap.city.lubumbashi", "Lubumbashi"), radius: 3 },
    { x: 0.48, y: 0.56, label: t("worldmap.city.matadi", "Matadi"), radius: 3 },
  ], [t])

  const connections = useMemo(() => [
    [0, 7], [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7],
    [0, 1], [1, 2], [3, 4],
  ], [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2
      canvas.height = canvas.offsetHeight * 2
      ctx.scale(2, 2)
    }
    resize()
    window.addEventListener("resize", resize)

    let animationId: number
    let time = 0

    const draw = () => {
      time += 0.005
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)

      // Draw connections with flow animation
      connections.forEach(([from, to]) => {
        const f = nodes[from]
        const n = nodes[to]
        const fx = f.x * w, fy = f.y * h
        const tx = n.x * w, ty = n.y * h

        ctx.beginPath()
        ctx.moveTo(fx, fy)
        ctx.lineTo(tx, ty)
        ctx.strokeStyle = "hsla(42, 85%, 55%, 0.08)"
        ctx.lineWidth = 1
        ctx.stroke()

        // Animated dot along connection
        const progress = (time % 1)
        const px = fx + (tx - fx) * progress
        const py = fy + (ty - fy) * progress

        ctx.beginPath()
        ctx.arc(px, py, 2, 0, Math.PI * 2)
        ctx.fillStyle = "hsla(42, 85%, 55%, 0.6)"
        ctx.fill()
      })

      // Draw nodes
      nodes.forEach((node, i) => {
        const x = node.x * w, y = node.y * h
        const isCenter = i === 7

        if (isCenter) {
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, node.radius * 4)
          gradient.addColorStop(0, "hsla(42, 85%, 55%, 0.2)")
          gradient.addColorStop(1, "hsla(42, 85%, 55%, 0)")
          ctx.beginPath()
          ctx.arc(x, y, node.radius * 4, 0, Math.PI * 2)
          ctx.fillStyle = gradient
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(x, y, node.radius, 0, Math.PI * 2)
        ctx.fillStyle = isCenter ? "hsl(42, 85%, 55%)" : "hsla(42, 85%, 55%, 0.6)"
        ctx.fill()

        if (isCenter) {
          ctx.beginPath()
          ctx.arc(x, y, node.radius + 4, 0, Math.PI * 2)
          ctx.strokeStyle = "hsla(42, 85%, 55%, 0.3)"
          ctx.lineWidth = 2
          ctx.stroke()
        }

        ctx.fillStyle = "rgba(255,255,255,0.4)"
        ctx.font = "10px 'Barlow Condensed', sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(node.label, x, y + node.radius + 14)
      })

      animationId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animationId)
    }
  }, [nodes])

  return (
    <section className="py-24 px-6 relative overflow-hidden" style={{ background: "hsl(216 45% 5%)" }}>
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="mb-12">
          <p className="font-condensed text-xs text-gold tracking-[0.5em] uppercase mb-3">{t("worldmap.subtitle", "Couverture mondiale")}</p>
          <h2 className="font-display text-[12vw] md:text-[8vw] lg:text-[7vw] text-white leading-none">{t("worldmap.title_notre", "NOTRE")} <span className="text-gradient-gold">{t("worldmap.title_reseau", "RÉSEAU")}</span></h2>
          <div className="flex items-center gap-4 mt-4">
            <div className="w-16 h-[2px] bg-gold" />
            <div className="w-4 h-[2px] bg-gold/40" />
          </div>
        </motion.div>

        <div className="relative w-full aspect-[2/1] max-h-[500px] border border-white/5" style={{ background: "hsl(216 45% 3%)" }}>
          <canvas ref={canvasRef} className="w-full h-full" />
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gold" />
            <span className="font-condensed text-[10px] text-white/20 tracking-widest uppercase">{t("worldmap.hub_central", "Hub central")}</span>
          </div>
          <div className="absolute top-4 left-24 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gold/60" />
            <span className="font-condensed text-[10px] text-white/20 tracking-widest uppercase">{t("worldmap.partner_cities", "Villes partenaires")}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
