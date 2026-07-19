"use client"

import { useState } from "react"

const items = [
  { author: "Entreprise A — Kinshasa", text: "Livraison rapide et suivi impeccable. Recommandé." },
  { author: "Importateur B — Lubumbashi", text: "Très bonne coordination avec le hub local." },
  { author: "Distributeur C — Matadi", text: "Qualité fournisseurs contrôlée et conformité douanière." }
]

export function TestimonialsCarousel() {
  const [index, setIndex] = useState(0)

  return (
    <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-[#020308]/90 p-6 text-white">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Témoignages</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)} className="px-3 py-1 rounded bg-white/5">‹</button>
          <button onClick={() => setIndex((i) => (i + 1) % items.length)} className="px-3 py-1 rounded bg-white/5">›</button>
        </div>
      </div>

      <blockquote className="text-lg leading-relaxed text-white/90">“{items[index].text}”</blockquote>
      <p className="mt-4 text-sm text-white/60">— {items[index].author}</p>
    </div>
  )
}
