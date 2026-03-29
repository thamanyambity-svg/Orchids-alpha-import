"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  MessageSquare, 
  Search, 
  Loader2,
  User,
  ShieldCheck
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { DashboardHeader } from "@/components/dashboard/header"
import { createClient } from "@/lib/supabase/client"

export default function MessagesPage() {
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<{
    id: string
    content: string
    created_at: string
    sender?: { full_name: string; status: string }
    recipient?: { full_name: string }
  }[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    async function fetchMessages() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data } = await supabase
          .from("messages")
          .select(`
            *,
            sender:profiles!messages_sender_id_fkey (full_name, status),
            recipient:profiles!messages_recipient_id_fkey (full_name)
          `)
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .order("created_at", { ascending: false })
        
        if (data) setMessages(data)
      }
      setLoading(false)
    }
    fetchMessages()
  }, [])

  return (
    <div>
      <DashboardHeader 
        title="Messagerie Sécurisée" 
        subtitle="Échangez en toute confidentialité avec vos partenaires certifiés"
      />

      <div className="p-6">
        <div className="flex items-center gap-4 mb-8 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
          <ShieldCheck className="w-8 h-8 text-primary shrink-0" />
          <div>
            <h3 className="font-bold text-sm">Espace de Discussion Protégé</h3>
            <p className="text-xs text-muted-foreground">
              Tous vos échanges sont cryptés et surveillés par Alpha Import Exchange pour garantir la sécurité de vos transactions.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher une conversation..." 
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card border border-border p-4 rounded-xl hover:bg-accent/30 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border border-border group-hover:border-primary/50 transition-colors overflow-hidden">
                      <User className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold">{message.sender?.full_name || "Partenaire"}</h3>
                        {message.sender?.status === 'VERIFIED' && (
                          <ShieldCheck className="w-3 h-3 text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{message.content}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-2">
                      {new Date(message.created_at).toLocaleDateString()}
                    </p>
                    <div className="w-2 h-2 rounded-full bg-primary ml-auto" />
                  </div>
                </div>
              </motion.div>
            ))}

            {messages.length === 0 && (
              <div className="p-12 text-center border-2 border-dashed border-border rounded-2xl">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <h3 className="font-semibold text-muted-foreground">Aucun message pour le moment</h3>
                <p className="text-sm text-muted-foreground">
                  Vos conversations avec les partenaires apparaîtront ici dès qu&apos;une commande sera lancée.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
