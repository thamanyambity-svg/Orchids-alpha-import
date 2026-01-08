"use client"

import { Star, ShieldCheck, Mail, Grid, LayoutGrid, FileText, BarChart3, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CertifiedPartnerCard({ partner }: { partner?: any }) {
  const displayPartner = partner || {
    full_name: "Omar",
    company_name: "OrientTrade Inc.",
    city: "Dubai",
    countries: { name: "United Arab Emirates", code: "ARE" },
    avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop"
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
             <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary/30">
            <img 
              src={displayPartner.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop"} 
              alt="Partner" 
              className="w-full h-full object-cover"
            />
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
            { icon: LayoutGrid, label: "Loginocus" },
            { icon: Grid, label: "Dpgrtintins" },
            { icon: FileText, label: "Transections" },
            { icon: BarChart3, label: "Trantacions" },
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center border border-white/5 hover:border-primary/30 transition-colors cursor-pointer group">
                <item.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-[9px] text-muted-foreground uppercase font-medium">{item.label}</span>
            </div>
          ))}
        </div>

        <Button className="w-full h-12 rounded-xl bg-primary/20 text-primary border border-primary/30 hover:bg-primary hover:text-primary-foreground transition-all font-bold tracking-widest uppercase text-xs">
          Contacter Omar
        </Button>
      </div>

      {/* Local Partner Section */}
      <div className="glass rounded-3xl overflow-hidden p-6 border-primary/10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-sm font-bold tracking-widest uppercase">Partenaire Local</h3>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Dubai Local</span>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-8 bg-[#00732f] rounded-sm relative overflow-hidden flex flex-col">
            <div className="h-1/3 bg-[#ff0000]" />
            <div className="h-1/3 bg-white" />
            <div className="h-1/3 bg-black" />
            <div className="absolute left-0 top-0 bottom-0 w-1/4 bg-[#00732f]" />
          </div>
          <div className="flex-1">
             <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-white tracking-tight">OrientTrade Inc.</h4>
                <LayoutGrid className="w-4 h-4 text-muted-foreground" />
             </div>
             <p className="text-[10px] text-muted-foreground uppercase">Dubai UALE</p>
             <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] text-muted-foreground uppercase">38: Elicteniane vemille</span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4].map((i) => (
                    <Star key={i} className="w-2.5 h-2.5 fill-primary text-primary" />
                  ))}
                   <Star className="w-2.5 h-2.5 text-muted-foreground" />
                </div>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-8">
          {[
            { icon: LayoutGrid, label: "Logitienne" },
            { icon: Grid, label: "Eoncetions" },
            { icon: FileText, label: "Transactions" },
            { icon: BarChart3, label: "Eointacions" },
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center border border-white/5 hover:border-primary/30 transition-colors cursor-pointer group">
                <item.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-[9px] text-muted-foreground uppercase font-medium">{item.label}</span>
            </div>
          ))}
        </div>

        <Button className="w-full h-12 rounded-xl bg-secondary/50 text-white border border-white/10 hover:border-primary/30 transition-all font-bold tracking-widest uppercase text-xs">
          Contacter Omar
        </Button>
      </div>
    </div>
  )
}
