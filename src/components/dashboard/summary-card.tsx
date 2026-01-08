"use client"

import { motion } from "framer-motion"
import { ChevronRight, Cpu, Package, ShoppingBag } from "lucide-react"

export function SummaryCard({ request }: { request?: any }) {
  if (!request) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 relative overflow-hidden group flex flex-col items-center justify-center min-h-[200px]"
      >
        <p className="text-muted-foreground font-mono text-sm uppercase tracking-widest">Aucune demande active</p>
        <p className="text-[10px] text-muted-foreground uppercase mt-2">Créez une nouvelle demande pour commencer</p>
      </motion.div>
    )
  }

  const progress = request.status === 'VALIDATED' ? 65 : request.status === 'COMPLETED' ? 100 : 30
  const statusLabel = request.status || 'EN COURS'

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6 relative overflow-hidden group"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-mono text-sm tracking-widest uppercase">RÉSUMÉ #{request.reference || request.id.slice(0, 8)}</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground uppercase">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${request.status === 'COMPLETED' ? 'bg-green-500' : 'bg-primary'}`} />
            <span>{statusLabel}</span>
          </div>
            <span>ALPHA IMPORT EXCHANGE SÉCURISÉ</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
          <Package className="w-8 h-8 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xl font-bold tracking-tight uppercase">{request.category || 'Importation'}</h3>
              <p className="text-xs text-muted-foreground uppercase">{request.quantity} {request.unit} - Budget: {request.budget_min}$ - {request.budget_max}$</p>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-bold border border-primary/30 uppercase">
                ● {statusLabel}
              </span>
            </div>
          </div>
          
          <div className="relative h-2 bg-secondary rounded-full overflow-hidden mt-4">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/50 to-primary glow-gold"
            />
            <div 
              style={{ left: `${progress}%` }}
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary border-4 border-background shadow-lg transition-all duration-1000 delay-500" 
            />
          </div>
          
          <div className="flex justify-between mt-2 text-[10px] font-mono text-muted-foreground uppercase tracking-tighter">
            <span>Sourcing</span>
            <span>{request.budget_min}$ / {request.budget_max}$</span>
            <span>Finalisé</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
