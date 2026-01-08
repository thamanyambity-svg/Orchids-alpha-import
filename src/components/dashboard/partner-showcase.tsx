"use client"

import { motion } from "framer-motion"
import { Star, MapPin } from "lucide-react"

export function PartnerShowcase() {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass rounded-3xl overflow-hidden relative min-h-[400px] flex flex-col justify-end p-8"
    >
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=2070&auto=format&fit=crop')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-6 bg-[#00732f] rounded-sm relative overflow-hidden flex flex-col">
            <div className="h-1/3 bg-[#ff0000]" />
            <div className="h-1/3 bg-white" />
            <div className="h-1/3 bg-black" />
            <div className="absolute left-0 top-0 bottom-0 w-1/4 bg-[#00732f]" />
          </div>
          <span className="text-sm font-mono tracking-widest text-white/80 uppercase">Dubai</span>
        </div>

        <h2 className="text-4xl font-bold mb-2 tracking-tight">OrientTrade Inc.</h2>
        
        <div className="flex items-center gap-2 mb-8">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4].map((i) => (
              <Star key={i} className="w-4 h-4 fill-primary text-primary" />
            ))}
            <Star className="w-4 h-4 text-primary" />
          </div>
          <span className="text-xs text-muted-foreground ml-2">Gza dou DBALLS</span>
        </div>

        <div className="glass-dark p-6 rounded-2xl border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary">
            <img 
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop" 
              alt="Partner" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Omar</p>
            <p className="text-xs text-muted-foreground">Votre demande est en cours de validation, nous vous informerons sous peu.</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
