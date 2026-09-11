"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { FileText, Loader2, MessagesSquare, Paperclip, Send, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/lib/i18n-context"
import {
  ACCEPT_PIECES,
  LONGUEUR_MAX_MESSAGE,
  PIECES_MAX_PAR_MESSAGE,
  TAILLE_MAX_PIECE,
  dossierDiscussion,
  extensionPour,
  genrePiece,
  typeAccepte,
  type PieceJointe,
} from "@/lib/messages/pieces-jointes"

/**
 * Discussion d'une demande, partagée par le client, le partenaire affecté et
 * l'administration Alpha Import. Chacun lit tout ; l'administration suit tout.
 *
 * Les fichiers sont déposés directement dans l'espace privé (les fonctions
 * serveur n'acceptent que quelques mégaoctets par requête), puis le message
 * est enregistré par la route, qui vérifie la participation et chaque pièce.
 * La liste se rafraîchit toutes les cinq secondes tant que l'onglet est
 * visible.
 */

interface PieceAffichee extends PieceJointe {
  url: string
}

interface MessageFil {
  id: string
  content: string
  created_at: string
  sender_id: string
  attachments: PieceAffichee[]
  sender: { full_name: string | null; role: string | null } | null
}

const ROLES: Record<string, string> = {
  BUYER: "Client",
  PARTNER: "Partenaire",
  ADMIN: "Alpha Import",
}

const INTERVALLE_MS = 5000

function heure(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

function Piece({ piece }: { piece: PieceAffichee }) {
  const genre = genrePiece(piece.mime)
  if (genre === "image") {
    return (
      <a href={piece.url} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={piece.url} alt={piece.name} loading="lazy" className="max-h-60 max-w-full rounded-lg border border-border object-cover" />
      </a>
    )
  }
  if (genre === "video") {
    return <video src={piece.url} controls preload="metadata" className="max-h-72 w-full max-w-md rounded-lg bg-black" />
  }
  if (genre === "audio") {
    return <audio src={piece.url} controls preload="metadata" className="w-full max-w-sm" />
  }
  return (
    <a
      href={piece.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex max-w-xs items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm hover:border-primary/50"
    >
      <FileText className="h-4 w-4 shrink-0 text-primary" />
      <span className="truncate">{piece.name}</span>
    </a>
  )
}

export function RequestThread({ requestId }: { requestId: string }) {
  const { t } = useLanguage()
  const [messages, setMessages] = useState<MessageFil[]>([])
  const [moi, setMoi] = useState<string | null>(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [brouillon, setBrouillon] = useState("")
  const [fichiers, setFichiers] = useState<File[]>([])
  const [envoi, setEnvoi] = useState(false)
  const selecteur = useRef<HTMLInputElement>(null)
  const bas = useRef<HTMLDivElement>(null)
  const dernierId = useRef<string | null>(null)

  const charger = useCallback(async () => {
    try {
      const res = await fetch(`/api/requests/${requestId}/messages`, { cache: "no-store" })
      const corps = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(corps.error || `Erreur ${res.status}`)
      setMessages(corps.messages ?? [])
      setMoi(corps.me ?? null)
      setErreur(null)
    } catch (e: any) {
      setErreur(e.message || "Discussion indisponible")
    } finally {
      setChargement(false)
    }
  }, [requestId])

  useEffect(() => {
    charger()
    const minuterie = setInterval(() => {
      if (!document.hidden) charger()
    }, INTERVALLE_MS)
    return () => clearInterval(minuterie)
  }, [charger])

  // Défile vers le bas seulement quand un nouveau message arrive.
  useEffect(() => {
    const dernier = messages[messages.length - 1]?.id ?? null
    if (dernier && dernier !== dernierId.current) {
      dernierId.current = dernier
      bas.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [messages])

  function ajouterFichiers(liste: FileList | null) {
    if (!liste) return
    const retenus: File[] = []
    for (const f of Array.from(liste)) {
      if (!typeAccepte(f.type)) {
        toast.error(`${f.name} : format non accepté (photo, vidéo, audio ou PDF)`)
        continue
      }
      if (f.size > TAILLE_MAX_PIECE) {
        toast.error(`${f.name} : dépasse 50 Mo`)
        continue
      }
      retenus.push(f)
    }
    setFichiers((prev) => {
      const tous = [...prev, ...retenus]
      if (tous.length > PIECES_MAX_PAR_MESSAGE) toast.error(`${PIECES_MAX_PAR_MESSAGE} fichiers maximum par message`)
      return tous.slice(0, PIECES_MAX_PAR_MESSAGE)
    })
    if (selecteur.current) selecteur.current.value = ""
  }

  async function envoyer() {
    const texte = brouillon.trim()
    if ((!texte && fichiers.length === 0) || envoi) return
    setEnvoi(true)
    const supabase = createClient()
    const deposes: PieceJointe[] = []
    try {
      for (const f of fichiers) {
        const chemin = `${dossierDiscussion(requestId)}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensionPour(f.type)}`
        const { error } = await supabase.storage.from("documents").upload(chemin, f, { contentType: f.type, upsert: false })
        if (error) throw new Error(`${f.name} : ${error.message}`)
        deposes.push({ path: chemin, name: f.name.slice(0, 200), mime: f.type, size: f.size })
      }

      const res = await fetch(`/api/requests/${requestId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: texte, attachments: deposes }),
      })
      const corps = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(corps.error || `Erreur ${res.status}`)

      setBrouillon("")
      setFichiers([])
      await charger()
    } catch (e: any) {
      // Un fichier déposé sans message enregistré ne doit pas rester orphelin.
      if (deposes.length > 0) {
        await supabase.storage.from("documents").remove(deposes.map((d) => d.path)).catch(() => {})
      }
      toast.error(e.message || "Envoi impossible")
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex items-center gap-3 border-b border-border px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
          <MessagesSquare className="h-5 w-5 text-primary" />
        </span>
        <div>
          <h3 className="t-label text-foreground">{t("thread.title", "Discussion du dossier")}</h3>
          <p className="text-xs text-muted-foreground">
            {t("thread.subtitle", "Client, partenaire sur place et Alpha Import — tout le monde voit tout.")}
          </p>
        </div>
      </header>

      <div className="max-h-[520px] min-h-[240px] space-y-4 overflow-y-auto px-5 py-4">
        {chargement ? (
          <div className="flex justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : erreur ? (
          <p className="py-10 text-center text-sm text-destructive">{erreur}</p>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {t(
              "thread.empty",
              "Aucun message. Précisez ici votre besoin : modèle, couleur, photos de référence, contraintes de livraison…"
            )}
          </p>
        ) : (
          messages.map((m) => {
            const mien = m.sender_id === moi
            const role = ROLES[m.sender?.role ?? ""] ?? ""
            return (
              <div key={m.id} className={`flex flex-col ${mien ? "items-end" : "items-start"}`}>
                <p className="mb-1 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">{mien ? t("thread.me", "Vous") : m.sender?.full_name || role || "—"}</span>
                  {role && !mien && <span className="ms-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">{role}</span>}
                  <span className="ms-2">{heure(m.created_at)}</span>
                </p>
                <div
                  className={`max-w-[85%] space-y-2 rounded-2xl px-4 py-3 text-sm ${
                    mien ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted"
                  }`}
                >
                  {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                  {m.attachments?.map((p) => <Piece key={p.path} piece={p} />)}
                </div>
              </div>
            )
          })
        )}
        <div ref={bas} />
      </div>

      <footer className="border-t border-border p-4">
        {fichiers.length > 0 && (
          <ul className="mb-3 flex flex-wrap gap-2">
            {fichiers.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-xs">
                <span className="max-w-[160px] truncate">{f.name}</span>
                <button
                  type="button"
                  aria-label={`Retirer ${f.name}`}
                  onClick={() => setFichiers((prev) => prev.filter((_, j) => j !== i))}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={selecteur}
            type="file"
            multiple
            accept={ACCEPT_PIECES}
            className="hidden"
            onChange={(e) => ajouterFichiers(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0"
            title={t("thread.attach", "Joindre photo, vidéo, audio ou PDF")}
            onClick={() => selecteur.current?.click()}
            disabled={envoi}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            value={brouillon}
            maxLength={LONGUEUR_MAX_MESSAGE}
            onChange={(e) => setBrouillon(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                envoyer()
              }
            }}
            placeholder={t("thread.placeholder", "Écrire un message… (Entrée pour envoyer, Maj+Entrée pour aller à la ligne)")}
            className="min-h-[44px] resize-none"
            rows={2}
            disabled={envoi}
          />
          <Button
            type="button"
            className="h-11 shrink-0"
            onClick={envoyer}
            disabled={envoi || (!brouillon.trim() && fichiers.length === 0)}
          >
            {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </footer>
    </section>
  )
}
