"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Wallet,
  Shield,
  Settings,
  LogOut,
  Crown,
  Box,
  Activity,
  LifeBuoy,
  Mail,
  Ship,
  ClipboardList,
  FileCheck
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

const navItems: { href: string; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
  { href: "/admin", label: "Tableau de Bord", icon: LayoutDashboard },
  { href: "/admin/requests", label: "Demandes", icon: ClipboardList },
  { href: "/admin/shipping", label: "Expéditions", icon: Ship },
  { href: "/admin/buyers", label: "Acheteurs", icon: Users },
  { href: "/admin/partners", label: "Partenaires", icon: UserCheck },
  { href: "/admin/suppliers", label: "Fournisseurs", icon: Box },
  { href: "/admin/finances", label: "Transactions", icon: Wallet },
  { href: "/admin/risks", label: "Gestion des Risques", icon: Shield },
  { href: "/admin/customs", label: "Douanes & Conformité", icon: FileCheck },
  { href: "/admin/reporting", label: "Journal d'Audit", icon: Activity },
  { href: "/admin/settings", label: "Paramètres", icon: Settings },
  { href: "/admin/support", label: "Support", icon: LifeBuoy },
  { href: "/admin/emails", label: "Boîte Mail IA", icon: Mail },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<{ full_name: string | null; role: string | null } | null>(null)

  useEffect(() => {
    async function getUser() {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', authUser.id)
          .single()

        setUser({
          full_name: profile?.full_name || "Administrateur",
          role: profile?.role === 'admin' ? 'Admin Principal' : 'Utilisateur'
        })
      }
    }
    getUser()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#0a0e14] border-r border-white/5 flex flex-col z-50">
      <div className="p-6">
        <Link href="/admin" className="flex items-center group">
          <div className="relative w-20 h-20 bg-black rounded-lg transition-transform group-hover:scale-105">
            <Image
              src="/logo-alpha-import.png?v=4"
              alt="Alpha Import Exchange"
              fill
              className="object-contain"
            />
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-8 overflow-y-auto custom-scrollbar">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href))

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-300 relative group",
                    isActive
                      ? "text-white bg-gradient-to-r from-white/10 to-transparent border border-white/10 shadow-lg"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
                    isActive ? "text-[#ffd700]" : ""
                  )} />
                  <span className="font-medium tracking-wide">{item.label}</span>

                  {item.badge && (
                    <span className="ml-auto w-5 h-5 flex items-center justify-center bg-destructive text-[10px] font-bold text-white rounded-full">
                      {item.badge}
                    </span>
                  )}

                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 w-1 h-6 bg-[#ffd700] rounded-r-full shadow-[0_0_10px_#ffd700]"
                    />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 mt-auto">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/5 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#ffd700]/10 flex items-center justify-center border border-[#ffd700]/20">
              <Crown className="w-4 h-4 text-[#ffd700]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.full_name || "Chargement..."}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-tighter">{user?.role || "..."}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs transition-colors border border-white/5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Déconnexion
          </button>
        </div>
      </div>
    </aside>
  )
}
