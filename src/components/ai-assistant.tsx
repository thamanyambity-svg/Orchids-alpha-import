
"use client"

import { useState, useRef, useEffect } from "react"
import { MessageSquare, X, Send, Bot, User, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Message {
    id: string
    role: 'ai' | 'user'
    text: string
    timestamp: Date
}

export function AiAssistant() {
    const [isOpen, setIsOpen] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'ai',
            text: "Bonjour ! Je suis l'Assistant Virtuel Alpha Import. 🤖\n\nJe suis là pour vous orienter 24/7. Que souhaitez-vous savoir ?\n\n- 📦 Suivre un cargo\n- 💰 Comprendre le paiement 60/40\n- 📋 Devenir Partenaire",
            timestamp: new Date()
        }
    ])
    const [input, setInput] = useState("")
    const [isTyping, setIsTyping] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages, isOpen])

    const handleSend = async () => {
        if (!input.trim()) return

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: input,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMsg])
        setInput("")
        setIsTyping(true)

        // Simulate AI thinking and response
        setTimeout(() => {
            const responseText = generateResponse(userMsg.text)
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                text: responseText,
                timestamp: new Date()
            }
            setMessages(prev => [...prev, aiMsg])
            setIsTyping(false)
        }, 1500)
    }

    const generateResponse = (query: string): string => {
        const q = query.toLowerCase()

        if (q.includes("suiv") || q.includes("track") || q.includes("cargo") || q.includes("ou est")) {
            return "Pour suivre votre cargo, connectez-vous à votre Tableau de Bord. Vous aurez besoin de votre numéro de référence (commençant par AIX-). 🚢\n\nSouhaitez-vous le lien de connexion ?"
        }
        else if (q.includes("liban") || q.includes("dubai") || q.includes("turquie") || q.includes("chine")) {
            return "Nous opérons activement depuis la Turquie, la Chine, Dubai et maintenant le Japon ! 🌍\n\nNous gérons l'enlèvement (EXW/FOB) et le transport jusqu'à Kinshasa."
        }
        else if (q.includes("prix") || q.includes("tarif") || q.includes("cout") || q.includes("combien")) {
            return "Nos tarifs dépendent du volume (CBM) et de la nature de la marchandise. Nous proposons une formule 'Landed Cost' : un prix tout compris avant de commander. 📊"
        }
        else if (q.includes("paiement") || q.includes("60") || q.includes("payer")) {
            return "Notre modèle est sécurisé : Vous payez 60% à la commande (fonds séquestrés avec double signature) et 40% uniquement à l'arrivée/livraison à Kinshasa. 🔐"
        }
        else if (q.includes("contact") || q.includes("telephone") || q.includes("parler")) {
            return "Vous pouvez joindre nos agents humains :\n📞 Kinshasa : +243 818 924 674\n📧 Email : contact@alpha-import.com"
        }
        else if (q.includes("bonjour") || q.includes("salut") || q.includes("hello")) {
            return "Bonjour ! Comment puis-je vous aider à importer aujourd'hui ? 👋"
        }

        return "Je ne suis pas sûr d'avoir compris. Je suis spécialisé dans l'importation et la logistique. Pouvez-vous reformuler ? 🤔\n\n(Ou tapez 'Contact' pour parler à un humain)."
    }

    return (
        <>
            <AnimatePresence>
                {isOpen && !isMinimized && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed bottom-24 right-6 w-96 h-[500px] z-[60] bg-black/90 backdrop-blur-xl border border-gold/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 bg-gold/10 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center border border-gold/50">
                                    <Bot className="w-6 h-6 text-gold" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm">Alpha Assistant</h3>
                                    <p className="text-[10px] text-gold/80 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        En ligne
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50 hover:text-white" onClick={() => setIsMinimized(true)}>
                                    <Minimize2 className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50 hover:text-white" onClick={() => setIsOpen(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Chat Area */}
                        <ScrollArea className="flex-1 p-4 space-y-4">
                            <div className="space-y-4">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] rounded-2xl p-3 text-sm leading-relaxed ${msg.role === 'user'
                                                    ? 'bg-gold text-black rounded-tr-none font-medium'
                                                    : 'bg-white/10 text-gray-100 rounded-tl-none border border-white/5'
                                                }`}
                                        >
                                            <p className="whitespace-pre-wrap">{msg.text}</p>
                                            <span className={`text-[9px] block mt-1 opacity-50 ${msg.role === 'user' ? 'text-black' : 'text-gray-400'}`}>
                                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-white/10 rounded-2xl rounded-tl-none p-3 border border-white/5 flex gap-1 items-center h-10 w-16 justify-center">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                        </div>
                                    </div>
                                )}
                                <div ref={scrollRef} />
                            </div>
                        </ScrollArea>

                        {/* Input Area */}
                        <div className="p-4 border-t border-white/10 bg-black/50">
                            <div className="flex gap-2">
                                <Input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Posez votre question..."
                                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                                />
                                <Button
                                    onClick={handleSend}
                                    className="bg-gold hover:bg-gold/90 text-black px-3"
                                >
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                    if (isMinimized) {
                        setIsMinimized(false)
                        setIsOpen(true)
                    } else {
                        setIsOpen(!isOpen)
                    }
                }}
                className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-gold to-yellow-600 rounded-full shadow-[0_0_30px_rgba(255,215,0,0.3)] z-[50] flex items-center justify-center text-black border-2 border-white/20"
            >
                {isOpen && !isMinimized ? <X className="w-7 h-7" /> : <MessageSquare className="w-7 h-7" />}
                {/* Notification Dot if closed ?? Maybe later */}
            </motion.button>
        </>
    )
}
