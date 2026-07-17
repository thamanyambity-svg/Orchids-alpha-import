"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Mail, Loader2, CheckCircle2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export default function NewsletterPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "newsletter_page" }),
      })
      if (!res.ok) throw new Error("Erreur")
      setDone(true)
      toast.success("Inscription confirmée !")
    } catch {
      toast.error("Erreur lors de l'inscription")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-6"
      >
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Mail className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Newsletter Alpha Import</h1>
        <p className="text-muted-foreground">
          Recevez chaque mois les actualités, conseils et opportunités d&apos;importation vers la RDC.
        </p>

        {done ? (
          <div className="p-6 rounded-xl bg-success/10 border border-success/20">
            <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-3" />
            <p className="font-semibold">Inscription confirmée !</p>
            <p className="text-sm text-muted-foreground mt-1">Merci de votre intérêt.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="text-center"
            />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "S'inscrire"}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
            <p className="text-xs text-muted-foreground">
              Pas de spam. Désinscription à tout moment.
            </p>
          </form>
        )}
      </motion.div>
    </div>
  )
}
