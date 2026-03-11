"use client"

import { Star, ShieldCheck, LayoutGrid, FileText, CreditCard, MessageSquare, Mail, Phone, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/** Partenaire affiché : peut venir de partner_profiles+user ou d'un fallback */
export interface PartnerDisplay {
  id?: string
  full_name?: string
  company_name?: string
  city?: string
  email?: string
  phone?: string
  avatar_url?: string
  countries?: { name?: string; code?: string }
}

export function CertifiedPartnerCard({ partner }: { partner?: PartnerDisplay | null }) {
  const displayPartner = partner || {
    full_name: "Achignon Bilongo",
    company_name: "MAARMALA - Head Officer",
    city: "Dubai",
    email: "achignon.pdg.maarmala.uae@aonosekehouseinvestmentdrc.site",
    phone: "+971500000000",
    countries: { name: "United Arab Emirates", code: "ARE" },
    avatar_url: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/WhatsApp-Image-2026-01-07-at-22.12.11-1767820691638.jpeg?width=8000&height=8000&resize=contain"
  }

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /* 
   * COMMUNICATION HANDLERS
   * Ensures automatic opening of real partner channels.
   */
  const handleWhatsApp = () => {
    // 1. Get Phone based on Country (Default to Maarmala UAE)
    let rawPhone = displayPartner.phone || "+971501201719";

    // Executive Overrides (Validated Numbers)
    if (displayPartner.countries?.code === 'JPN') {
      rawPhone = "+819083267671"; // Pam Congo Japan
    } else if (displayPartner.countries?.code === 'ARE') {
      rawPhone = "+971501201719"; // Achignon Bilongo UAE
    }

    // 2. Sanitize: Remove spaces, dashes, parens, pluses
    // Example: "+971 50 123" -> "97150123"
    const cleanPhone = rawPhone.replace(/\D/g, '');

    // 3. Open WhatsApp Web/App
    // Note: wa.me works best with pure digits including country code
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  }

  const handleEmail = () => {
    // Smart routing based on country/partner
    let targetEmail = displayPartner.email;

    // Force specific requested emails based on country code if dynamic data isn't perfectly clean
    if (displayPartner.countries?.code === 'JPN') {
      targetEmail = 'assanimususa.pdg.pam.congo.japon@aonosekehouseinvestmentdrc.site';
    } else if (displayPartner.countries?.code === 'ARE') {
      targetEmail = 'achignon.pdg.maarmala.uae@aonosekehouseinvestmentdrc.site';
    } else if (!targetEmail) {
      // Ultimate fallback
      targetEmail = 'achignon.pdg.maarmala.uae@aonosekehouseinvestmentdrc.site';
    }

    window.location.href = `mailto:${targetEmail}?subject=Ref: Alpha Import Exchange - Support`;
  }

  return (
    <div className="space-y-6">
      {/* Certified Partner Section */}
      <div className="glass rounded-3xl overflow-hidden p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none mb-1">
                {partner ? "Partenaire Assigné" : "Partenaire Certifié"}
              </p>
              <h3 className="text-sm font-bold tracking-widest uppercase">
                {partner ? "VOTRE PARTENAIRE" : "CERTIFIÉ DUBAÏ"}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-secondary/50 border border-white/5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-[9px] font-mono text-primary uppercase">En ligne</span>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary/30 relative group">
            <img
              src={displayPartner.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop"}
              alt="Partner"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ExternalLink className="w-4 h-4 text-white" />
            </div>
          </div>
          <div>
            <h4 className="text-lg font-bold text-white tracking-tight">{displayPartner.company_name || displayPartner.full_name}</h4>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground uppercase">{displayPartner.city} {displayPartner.countries?.name}</span>
              {displayPartner.countries?.code === 'ARE' && (
                <div className="w-4 h-2.5 bg-[#00732f] rounded-sm relative overflow-hidden flex flex-col">
                  <div className="h-1/3 bg-[#ff0000]" />
                  <div className="h-1/3 bg-white" />
                  <div className="h-1/3 bg-black" />
                  <div className="absolute left-0 top-0 bottom-0 w-1/4 bg-[#00732f]" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-3 h-3 fill-primary text-primary" />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-8">
          {[
            { icon: LayoutGrid, label: "Hub", target: "partner-showcase" },
            { icon: FileText, label: "Docs", target: "documents-section" },
            { icon: CreditCard, label: "Paie", target: "transactions-section" },
            { icon: MessageSquare, label: "Chat", target: "messaging-section" },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center gap-2"
              onClick={() => scrollToSection(item.target)}
            >
              <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center border border-white/5 hover:border-primary/30 transition-colors cursor-pointer group">
                <item.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-[9px] text-muted-foreground uppercase font-medium">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <Button
            onClick={handleWhatsApp}
            className="h-11 rounded-xl bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 hover:bg-[#25D366] hover:text-white transition-all font-bold tracking-widest uppercase text-[10px]"
          >
            <Phone className="w-3 h-3 mr-2" />
            WhatsApp
          </Button>
          <Button
            onClick={handleEmail}
            className="h-11 rounded-xl bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-primary-foreground transition-all font-bold tracking-widest uppercase text-[10px]"
          >
            <Mail className="w-3 h-3 mr-2" />
            Email
          </Button>
        </div>

        <Button
          onClick={() => scrollToSection('messaging-section')}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:scale-[1.02] transition-all font-bold tracking-widest uppercase text-xs shadow-lg shadow-primary/20"
        >
          Ouvrir le Chat Sécurisé
        </Button>
      </div>
    </div>
  )
}

