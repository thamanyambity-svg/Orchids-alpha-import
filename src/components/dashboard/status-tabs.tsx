"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import { cn } from "@/lib/utils"

const tabs = ["GLOBAL", "SOURCING", "LOGISTIQUE", "DOCUMENTATION"]

export function StatusTabs({ status }: { status?: string }) {
  const [activeTab, setActiveTab] = useState("GLOBAL")

  const displayStatus = status || 'En attente'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-mono tracking-[0.2em] text-muted-foreground uppercase flex items-center gap-2">
          Statut de la demande <span className="text-primary ml-2">{displayStatus}</span>
        </h2>
      </div>
      
      <div className="flex bg-secondary/30 p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "relative px-6 py-2 text-[10px] font-bold tracking-widest transition-colors duration-200",
              activeTab === tab ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === tab && (
              <motion.div
                layoutId="active-tab"
                className="absolute inset-0 bg-primary rounded-lg shadow-lg"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">{tab}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
