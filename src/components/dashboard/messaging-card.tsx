"use client"

import { motion } from "framer-motion"
import { MessageSquare, Send, Mic, Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function MessagingCard() {
  const messages = [
    {
      id: 1,
      sender: "Omar (Partenaire)",
      role: "Sypsan ouP",
      text: "Bonjour Ahmad, merci pour votre prefiert paliment. Voc peceque en bloibre qubiotare coensons.",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop",
      isPartner: true
    },
    {
      id: 2,
      sender: "Vous",
      text: "Merci Omar - aimatis votre rettor made las de la plorarattes, cos qui li pur nemtou !",
      isPartner: false
    },
    {
      id: 3,
      sender: "Omar (Partenaire)",
      text: "Merci Omar, partierte coensons. prongantard et partene coonmates",
      isPartner: true,
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop",
    }
  ]

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
          <span className="text-xs font-mono text-muted-foreground">36</span>
          <Paperclip className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[400px]">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.isPartner ? "" : "flex-row-reverse"}`}>
            {msg.isPartner && (
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                <img src={msg.avatar} alt={msg.sender} className="w-full h-full object-cover" />
              </div>
            )}
            <div className={`space-y-1 max-w-[80%] ${msg.isPartner ? "" : "text-right"}`}>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{msg.sender}</p>
              <div className={`p-4 rounded-2xl text-sm ${msg.isPartner ? "bg-secondary/50 rounded-tl-none" : "bg-primary text-primary-foreground rounded-tr-none"}`}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-secondary/30 mt-auto">
        <div className="relative">
          <Input 
            placeholder="Écrire un message..." 
            className="bg-background/50 border-white/5 pr-24 h-12 rounded-xl"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Mic className="w-4 h-4" />
            </button>
            <Button size="sm" className="h-8 rounded-lg">
              Envoyer
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
