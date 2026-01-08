"use client"

import { motion } from "framer-motion"
import { ChevronRight, Cpu } from "lucide-react"

export function SummaryCard() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6 relative overflow-hidden group"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-mono text-sm tracking-widest">RÉSUMÉ #542300</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span>EN COURS</span>
          </div>
          <span>G.A. EILO CATION</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
          <Cpu className="w-8 h-8 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xl font-bold tracking-tight">Électronique</h3>
              <p className="text-xs text-muted-foreground">Elettractions s Ahtral UAE</p>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-bold border border-primary/30">
                ● En Cours
              </span>
            </div>
          </div>
          
          <div className="relative h-2 bg-secondary rounded-full overflow-hidden mt-4">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "65%" }}
              transition={{ duration: 1, delay: 0.5 }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/50 to-primary glow-gold"
            />
            <div className="absolute left-[65%] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary border-4 border-background shadow-lg" />
          </div>
          
          <div className="flex justify-between mt-2 text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">
            <span>Sourcing (Dubai)</span>
            <span>12.200 $ / 55.000 $</span>
            <span>Finalisé</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
