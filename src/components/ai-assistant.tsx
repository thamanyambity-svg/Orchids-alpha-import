
"use client"

import { useState, useRef, useEffect } from "react"
import { MessageSquare, X, Send, Bot, Minimize2, ShieldCheck, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"

interface MessageOption {
    label: string
    action: () => void
    variant?: "default" | "outline" | "gold"
}

interface Message {
    id: string
    role: 'ai' | 'user'
    text: string
    timestamp: Date
    options?: MessageOption[]
    card?: {
        title: string
        description: string
        cta: string
        link: string
    }
}

export function AiAssistant() {
    const [isOpen, setIsOpen] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)
    const [isTyping, setIsTyping] = useState(false)
    const [input, setInput] = useState("")
    const scrollRef = useRef<HTMLDivElement>(null)

    const [messages, setMessages] = useState<Message[]>([])

    // Init Chat on Load
    useEffect(() => {
        if (messages.length === 0) {
            resetChat()
        }
    }, [])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages, isOpen, isTyping])

    const addAiMessage = (text: string, options?: MessageOption[], card?: Message['card'], delay = 1000) => {
        setIsTyping(true)
        setTimeout(() => {
            const msg: Message = {
                id: Date.now().toString(),
                role: 'ai',
                text,
                timestamp: new Date(),
                options,
                card
            }
            setMessages(prev => [...prev, msg])
            setIsTyping(false)
        }, delay)
    }

    const addUserMessage = (text: string) => {
        const msg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text,
            timestamp: new Date()
        }
        setMessages(prev => [...prev, msg])
    }

    // --- SCENARIOS ---

    const resetChat = () => {
        setMessages([{
            id: 'init',
            role: 'ai',
            text: "Bonjour. Je suis l'Assistant Virtuel Officiel d'Alpha Import Exchange.\n\nJe suis là pour sécuriser vos opérations et vous orienter. Que souhaitez-vous faire ?",
            timestamp: new Date(),
            options: [
                { label: "🛍️ Devenir Acheteur (Ouvrir un Compte)", action: () => startAcquisitionFunnel(), variant: "gold" },
                { label: "📦 Suivre un cargo", action: () => handleKeyword("suivi") },
                { label: "💰 Paiement 60/40", action: () => handleKeyword("paiement") },
                { label: "🤝 Devenir Partenaire", action: () => handleKeyword("partenaire") }
            ]
        }])
    }

    const startAcquisitionFunnel = () => {
        addUserMessage("🛍️ Devenir Acheteur")
        addAiMessage(
            "Bienvenue dans le cercle Alpha Import. Pour sécuriser vos fonds et vos commandes, nous fonctionnons via un Espace Client Sécurisé.\n\nÊtes-vous une Entreprise ou un Particulier ?",
            [
                { label: "🏢 Entreprise (J'ai un RCCM)", action: () => preQualify("company") },
                { label: "👤 Particulier (Commerce personnel)", action: () => preQualify("individual") }
            ]
        )
    }

    const preQualify = (type: "company" | "individual") => {
        addUserMessage(type === "company" ? "🏢 Entreprise" : "👤 Particulier")

        addAiMessage(
            "C'est noté. La sécurité bancaire est notre priorité.\n\nAvant de créer votre accès, confirmez-vous avoir une Pièce d'Identité valide (Passeport ou Carte d'Électeur) prête à être scannée pour la validation KYC ?",
            [
                { label: "✅ Oui, je suis prêt", action: () => showConversionCard(type), variant: "gold" },
                { label: "ℹ️ Pourquoi est-ce obligatoire ?", action: () => explainKYC(type) }
            ]
        )
    }

    const explainKYC = (type: "company" | "individual") => {
        addUserMessage("ℹ️ Pourquoi est-ce obligatoire ?")
        addAiMessage(
            "Nous appliquons les normes bancaires strictes (KYC/AML) pour garantir que chaque transaction est traçable et sécurisée.\n\nCela protège vos fonds contre l'usurpation d'identité. Une fois votre identité validée, vous accédez au paiement 60/40.",
            [
                { label: "✅ Je comprends, je suis prêt", action: () => showConversionCard(type), variant: "gold" }
            ]
        )
    }

    const showConversionCard = (type: "company" | "individual") => {
        addUserMessage("✅ Oui, je suis prêt")

        // Construct Deep Link
        const activityParam = type === "company" ? "retailer" : "individual" // Mapping to Register Page logic
        const registerUrl = `/register?activity_type=${activityParam}&source=chatbot_assistant`

        addAiMessage(
            "Excellent. Cliquez sur le lien sécurisé ci-dessous pour activer votre Coffre-fort Importateur.\n\nJe reste ici pour vous guider après l'inscription.",
            undefined,
            {
                title: "OUVERTURE DE COMPTE SÉCURISÉ",
                description: "Accès immédiat au Dashboard Importateur.",
                cta: "CRÉER MON COMPTE SÉCURISÉ",
                link: registerUrl
            }
        )

        // Follow-up advice
        addAiMessage(
            "Une fois votre compte créé, n'oubliez pas :\n\n1. Validez votre identité (KYC) dans les paramètres.\n2. Attendez la validation (2h max) pour voir nos coordonnées bancaires.\n\nAvez-vous besoin d'autre chose ?",
            [
                { label: "Non merci, c'est tout", action: () => addUserMessage("Merci"), variant: "outline" }
            ],
            undefined,
            2500 // Delay to show up after the card
        )
    }

    const handleKeyword = (key: string) => {
        if (key === "suivi") {
            addUserMessage("📦 Suivre un cargo")
            addAiMessage("Pour suivre votre expédition, veuillez vous connecter à votre Espace Client et saisir votre référence AIX-.\n\nSi vous n'avez pas de compte, je vous invite à en créer un.",
                [{ label: "Créer un compte", action: () => startAcquisitionFunnel() }]
            )
        } else if (key === "paiement") {
            addUserMessage("💰 Comprendre le paiement 60/40")
            addAiMessage("Le modèle '60/40 Double Signature' sécurise votre argent :\n\n1. Vous versez 60% à la commande (Fonds Séquestrés).\n2. Nous achetons et expédions.\n3. Vous ne payez les 40% restants QU'À L'ARRIVÉE à Kinshasa.\n\nSi la marchandise n'arrive pas, vous êtes remboursé.",
                [{ label: "Ça m'intéresse", action: () => startAcquisitionFunnel(), variant: "gold" }]
            )
        } else if (key === "partenaire") {
            addUserMessage("🤝 Devenir Partenaire")
            addAiMessage("Nous recrutons des partenaires logistiques fiables (Chine, Turquie, Dubai). Veuillez soumettre votre candidature via la page dédiée.",
                undefined,
                {
                    title: "CANDIDATURE PARTENAIRE",
                    description: "Rejoignez le réseau Alpha Import.",
                    cta: "POSTULER MAINTENANT",
                    link: "/partner-request"
                }
            )
        }
    }

    // --- MANUAL INPUT HANDLING ---

    const handleManualSend = () => {
        if (!input.trim()) return
        const text = input
        setInput("")
        addUserMessage(text)

        // Fallback logic
        setTimeout(() => {
            const lower = text.toLowerCase()
            if (lower.includes("aide") || lower.includes("humain") || lower.includes("parler") || lower.includes("probleme")) {
                addAiMessage(
                    "Je comprends que vous ayez besoin d'une assistance humaine. Nos agents sont disponibles sur WhatsApp.",
                    undefined,
                    {
                        title: "SUPPORT WHATSAPP",
                        description: "Discutez avec un agent (Kinshasa/Dubai).",
                        cta: "OUVRIR WHATSAPP",
                        link: "https://wa.me/243818924674"
                    }
                )
            } else {
                addAiMessage(
                    "Je suis programmé pour garantir la précision. Pour cette demande spécifique, je vous invite à contacter notre support ou à utiliser le menu.",
                    [
                        { label: "Retour au Menu", action: () => resetChat() },
                        { label: "Parler à un humain", action: () => handleManualSend() }
                    ]
                )
            }
        }, 1000)
    }

    return (
        <>
            <AnimatePresence>
                {isOpen && !isMinimized && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed bottom-24 right-6 w-[90vw] md:w-96 h-[600px] z-[60] bg-[#09090b]/95 backdrop-blur-xl border border-gold/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden font-sans"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 bg-gold/5 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center border border-gold/30">
                                    <Bot className="w-6 h-6 text-gold" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm">Alpha Assistant</h3>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] text-white/60">En ligne • Sécurisé</span>
                                    </div>
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
                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-6 pb-4">
                                {messages.map((msg) => (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        key={msg.id}
                                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-2`}
                                    >
                                        {/* Message Bubble */}
                                        <div
                                            className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                                    ? 'bg-gold text-black rounded-tr-none font-medium'
                                                    : 'bg-white/5 text-gray-100 rounded-tl-none border border-white/10'
                                                }`}
                                        >
                                            <p className="whitespace-pre-wrap">{msg.text}</p>
                                        </div>

                                        {/* Rich Content: Card */}
                                        {msg.card && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="max-w-[85%] w-full bg-gradient-to-br from-gray-900 to-black border border-gold/30 rounded-xl p-4 mt-1 overflow-hidden relative group cursor-pointer"
                                                onClick={() => window.location.href = msg.card!.link}
                                            >
                                                <div className="absolute top-0 right-0 w-20 h-20 bg-gold/10 rounded-full blur-2xl -mr-10 -mt-10" />
                                                <div className="relative z-10">
                                                    <h4 className="text-gold font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-2">
                                                        <ShieldCheck className="w-3 h-3" /> {msg.card.title}
                                                    </h4>
                                                    <p className="text-gray-400 text-xs mb-4">{msg.card.description}</p>
                                                    <Button className="w-full bg-gold hover:bg-gold/90 text-black font-bold h-9 text-xs">
                                                        {msg.card.cta} <ArrowRight className="w-3 h-3 ml-2" />
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* Rich Content: Options */}
                                        {msg.options && (
                                            <div className="flex flex-wrap gap-2 mt-1 max-w-[90%]">
                                                {msg.options.map((opt, idx) => (
                                                    <Button
                                                        key={idx}
                                                        variant={opt.variant === 'gold' ? 'default' : 'outline'}
                                                        size="sm"
                                                        onClick={opt.action}
                                                        className={`h-auto py-2 px-3 text-xs whitespace-normal text-left h-fit ${opt.variant === 'gold'
                                                                ? 'bg-gold text-black hover:bg-gold/90 border-transparent'
                                                                : 'bg-transparent border-white/20 text-white hover:bg-white/10'
                                                            }`}
                                                    >
                                                        {opt.label}
                                                    </Button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Timestamp */}
                                        <span className="text-[9px] text-white/20 px-1">
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </motion.div>
                                ))}

                                {isTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-white/5 rounded-2xl rounded-tl-none p-3 border border-white/10 flex gap-1 items-center h-10 w-16 justify-center">
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
                        <div className="p-4 border-t border-white/10 bg-black/60 backdrop-blur-md shrink-0">
                            <div className="flex gap-2">
                                <Input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleManualSend()}
                                    placeholder="Posez une question..."
                                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-gold/50"
                                />
                                <Button
                                    onClick={handleManualSend}
                                    className="bg-gold hover:bg-gold/90 text-black px-3 shrink-0"
                                >
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Button Trigger */}
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
                className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-[#E5B865] to-[#B8860B] rounded-full shadow-[0_0_40px_rgba(229,184,101,0.2)] z-[50] flex items-center justify-center text-black border border-white/20 group"
            >
                <span className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-20 group-hover:opacity-40" />
                {isOpen && !isMinimized ? <X className="w-7 h-7 relative z-10" /> : <MessageSquare className="w-7 h-7 relative z-10" />}
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] text-white items-center justify-center font-bold">1</span>
                    </span>
                )}
            </motion.button>
        </>
    )
}
