"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useInView, useScroll, useTransform, animate } from "framer-motion"

/** Révélation au scroll (fade + slide), respecte reduced-motion via Framer. */
export function Reveal({
  children, delay = 0, y = 24, className,
}: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

/** Conteneur à révélation en cascade pour ses enfants <Reveal>. */
export function Stagger({ children, className, gap = 0.08 }: { children: React.ReactNode; className?: string; gap?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  )
}

export const staggerItem = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}

/** Compteur animé (de 0 → value) au passage dans le viewport. */
export function Counter({
  value, prefix = "", suffix = "", duration = 1.6, decimals = 0, className,
}: { value: number; prefix?: string; suffix?: string; duration?: number; decimals?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-40px" })
  const [display, setDisplay] = useState("0")

  useEffect(() => {
    if (!inView) return
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })),
    })
    return () => controls.stop()
  }, [inView, value, duration, decimals])

  return <span ref={ref} className={className}>{prefix}{display}{suffix}</span>
}

/** Parallax vertical léger basé sur le scroll. */
export function Parallax({ children, speed = 0.2, className }: { children: React.ReactNode; speed?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const y = useTransform(scrollYProgress, [0, 1], [`${-speed * 100}px`, `${speed * 100}px`])
  return <motion.div ref={ref} style={{ y }} className={className}>{children}</motion.div>
}

/** Particules or scintillantes (lumières de quai) — canvas léger. */
export function GoldParticles({ count = 60, className }: { count?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    let raf = 0
    let w = 0, h = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      w = canvas.offsetWidth; h = canvas.offsetHeight
      canvas.width = w * dpr; canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(canvas)
    const parts = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() * 1.6 + 0.4,
      a: Math.random(), s: Math.random() * 0.02 + 0.004,
      vy: -(Math.random() * 0.15 + 0.02),
    }))
    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      for (const p of parts) {
        p.a += p.s; if (p.a > 1 || p.a < 0) p.s *= -1
        p.y += p.vy; if (p.y < -5) { p.y = h + 5; p.x = Math.random() * w }
        const alpha = 0.15 + Math.abs(Math.sin(p.a)) * 0.6
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(232, 169, 60, ${alpha})`
        ctx.shadowColor = "rgba(232,169,60,0.8)"; ctx.shadowBlur = 6
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [count])
  return <canvas ref={canvasRef} className={className} aria-hidden />
}
