"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ShoppingCart,
  CircleDollarSign,
  MessageSquare,
  Headphones,
  Settings,
  LogOut,
  AlertTriangle
} from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "Tableau de Bord", icon: LayoutDashboard },
  // { href: "/dashboard/buyers", label: "Acheteurs", icon: Users }, // Removed for client view
  { href: "/dashboard/requests", label: "Commandes", icon: ShoppingCart },
  { href: "/dashboard/transactions", label: "Transactions", icon: CircleDollarSign },
  { href: "/dashboard/messages", label: "Messagerie", icon: MessageSquare },
  { href: "/dashboard/support", label: "Support", icon: Headphones },
  { href: "/dashboard/incidents", label: "Incidents", icon: AlertTriangle },
]


export function DashboardSidebar() {
  const pathname = usePathname()
  const _router = useRouter()
  const [_profile, setProfile] = useState<Record<string, unknown> | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, email, status, company_name')
          .eq('id', user.id)
          .single()
        setProfile(data)
      }
    }
    fetchProfile()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    // Force hard reload to clear all client states/caches
    window.location.href = "/login"
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar/50 backdrop-blur-xl border-r border-white/5 flex flex-col z-50">
      <div className="p-6">
        <Link href="/" className="flex items-center group">
          <div className="relative w-16 h-16 bg-black rounded-lg transition-transform group-hover:scale-105">
            <Image
              src="/logo-alpha-import.png?v=4"
              alt="Alpha Import Exchange"
              fill
              className="object-contain"
            />
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href))

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3 rounded-xl text-sm transition-all duration-300 group",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className="font-medium tracking-tight">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="w-1 h-4 bg-primary rounded-full ml-auto"
                    />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 space-y-2">
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-4 px-4 py-3 rounded-xl text-sm transition-all duration-300 group text-muted-foreground hover:text-foreground hover:bg-white/5",
            pathname === "/dashboard/settings" && "bg-primary/10 text-primary border border-primary/20"
          )}
        >
          <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
          <span className="font-medium tracking-tight">Réglages</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-4 px-4 py-3 rounded-xl text-sm text-destructive/70 hover:text-destructive hover:bg-destructive/5 w-full transition-all duration-300 group"
        >
          <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
          <span className="font-medium tracking-tight">Déconnexion</span>
        </button>
      </div>
    </aside>
  )
}

