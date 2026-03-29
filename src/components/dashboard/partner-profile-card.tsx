"use client"

import { motion } from "framer-motion"
import { 
  ShieldCheck, 
  Star, 
  Package, 
  Calendar, 
  MessageCircle, 
  Mail, 
  Phone,
  ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface PartnerProfile {
  id: string
  full_name: string
  company_name: string
  avatar_url?: string
  bio: string
  whatsapp_number: string
  email: string
  phone: string
  experience_years: number
  total_orders_handled: number
  performance_score: number
  country_name: string
}

interface PartnerProfileCardProps {
  partner: PartnerProfile
  onContact?: (method: 'whatsapp' | 'email' | 'phone') => void
}

export function PartnerProfileCard({ partner, onContact }: PartnerProfileCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/5 to-transparent p-6 shadow-lg"
    >
      <div className="absolute top-0 right-0 p-4">
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1 px-3 py-1">
          <ShieldCheck className="w-3.5 h-3.5" />
            Partenaire Certifié AlphaIX
        </Badge>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="relative">
          <Avatar className="w-24 h-24 border-4 border-background shadow-xl">
            <AvatarImage src={partner.avatar_url} alt={partner.full_name} />
            <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
              {partner.full_name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-2 -right-2 bg-background rounded-full p-1 shadow-md border border-border">
            <div className="bg-green-500 w-3 h-3 rounded-full" />
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-2xl font-bold tracking-tight">{partner.full_name}</h3>
            <p className="text-primary font-medium">{partner.company_name}</p>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="w-4 h-4 fill-current" />
                <span className="font-bold">{partner.performance_score}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground text-sm">
                <Package className="w-4 h-4" />
                <span>{partner.total_orders_handled}+ commandes</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground text-sm">
                <Calendar className="w-4 h-4" />
                <span>{partner.experience_years} ans d&apos;exp.</span>
              </div>
            </div>
          </div>

          <p className="text-muted-foreground leading-relaxed italic">
            &quot;{partner.bio}&quot;
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button 
              variant="outline" 
              className="w-full gap-2 border-green-500/20 hover:bg-green-500/10 hover:text-green-600 transition-all duration-300"
              onClick={() => {
                window.open(`https://wa.me/${partner.whatsapp_number.replace(/[^0-9]/g, '')}`, '_blank')
                onContact?.('whatsapp')
              }}
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </Button>
            <Button 
              variant="outline" 
              className="w-full gap-2 border-primary/20 hover:bg-primary/10 transition-all duration-300"
              onClick={() => {
                window.location.href = `mailto:${partner.email}`
                onContact?.('email')
              }}
            >
              <Mail className="w-4 h-4" />
              Email
            </Button>
            <Button 
              variant="outline" 
              className="w-full gap-2 border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-600 transition-all duration-300"
              onClick={() => {
                window.location.href = `tel:${partner.phone}`
                onContact?.('phone')
              }}
            >
              <Phone className="w-4 h-4" />
              Appeler
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-primary/10 flex items-center justify-between text-xs text-muted-foreground">
        <p>Vérifié par l&apos;équipe de conformité AlphaIX</p>
        <div className="flex items-center gap-1 text-primary">
          <span>Voir l&apos;historique complet</span>
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </motion.div>
  )
}
