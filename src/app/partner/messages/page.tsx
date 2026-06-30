"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { DashboardHeader } from "@/components/dashboard/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Send, MessageSquare, ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { toast } from "sonner"

export default function PartnerMessagesPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [reply, setReply] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    setMe(user.id)
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
    setMessages(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function send(counterpartId: string, requestId: string | null, key: string) {
    const content = (reply[key] || "").trim()
    if (!content || !me) return
    setSending(true)
    const { error } = await supabase.from("messages").insert({
      sender_id: me, recipient_id: counterpartId, request_id: requestId, content,
    })
    setSending(false)
    if (error) { toast.error("Échec de l'envoi"); return }
    setReply((r) => ({ ...r, [key]: "" }))
    toast.success("Message envoyé")
    load()
  }

  return (
    <div>
      <DashboardHeader title="Messagerie" subtitle="Échangez avec les clients et l'administration sur vos dossiers" />
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : messages.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-border rounded-2xl">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="font-semibold text-muted-foreground">Aucun message</h3>
            <p className="text-sm text-muted-foreground">Vos échanges sur les dossiers apparaîtront ici.</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl">
            {messages.map((m) => {
              const received = m.recipient_id === me
              const counterpart = received ? m.sender_id : m.recipient_id
              return (
                <div key={m.id} className={`p-4 rounded-xl border ${received ? "bg-card border-border" : "bg-primary/5 border-primary/20"}`}>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    {received ? <ArrowDownLeft className="w-3 h-3 text-blue-500" /> : <ArrowUpRight className="w-3 h-3 text-primary" />}
                    <span>{received ? "Reçu" : "Envoyé"}</span>
                    <span>· {new Date(m.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm">{m.content}</p>
                  {received && (
                    <div className="flex gap-2 mt-3">
                      <Input placeholder="Répondre…" value={reply[m.id] || ""} onChange={(e) => setReply((r) => ({ ...r, [m.id]: e.target.value }))} />
                      <Button size="icon" disabled={sending} onClick={() => send(counterpart, m.request_id, m.id)}>
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
