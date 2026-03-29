"use client"

import { MessageSquare, Mic, Paperclip, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

import type { Message, Profile } from "@/lib/types"

export function MessagingCard({ partner }: { partner?: Profile | null }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchMessages() {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
            .order('created_at', { ascending: true })
          
          if (data) setMessages(data)
        }
      } catch (error) {
        console.error('Error fetching messages:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()

    // Real-time subscription
    const channel = supabase
      .channel('messages_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim() || !partner) return
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('messages').insert({
          content: newMessage,
          sender_id: user.id,
          recipient_id: partner.id,
        })
        setNewMessage("")
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  return (
    <div className="glass rounded-3xl overflow-hidden flex flex-col h-full min-h-[500px]">
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-widest uppercase">MESSAGERIE</h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">{messages.length}</span>
          <Paperclip className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[400px]">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Aucun message</p>
            <p className="text-[10px] text-muted-foreground uppercase">Commencez la discussion avec votre partenaire</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isPartner = msg.sender_id === partner?.id
            return (
              <div key={msg.id} className={`flex gap-4 ${isPartner ? "" : "flex-row-reverse"}`}>
                {isPartner && (
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-primary/10 flex items-center justify-center">
                    {partner?.avatar_url ? (
                      <img src={partner.avatar_url} alt={partner.full_name ?? ''} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold text-primary">{partner?.full_name?.charAt(0)}</span>
                    )}
                  </div>
                )}
                <div className={`space-y-1 max-w-[80%] ${isPartner ? "" : "text-right"}`}>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    {isPartner ? (partner?.full_name || "Partenaire") : "Vous"}
                  </p>
                  <div className={`p-4 rounded-2xl text-sm ${isPartner ? "bg-secondary/50 rounded-tl-none" : "bg-primary text-primary-foreground rounded-tr-none"}`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="p-4 bg-secondary/30 mt-auto">
        <div className="relative">
          <Input 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Écrire un message..." 
            className="bg-background/50 border-white/5 pr-24 h-12 rounded-xl"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Mic className="w-4 h-4" />
            </button>
            <Button size="sm" className="h-8 rounded-lg" onClick={handleSend} disabled={!partner}>
              Envoyer
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
