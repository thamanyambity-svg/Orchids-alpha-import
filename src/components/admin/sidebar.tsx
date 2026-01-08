"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { 
  Shield, 
  LayoutDashboard, 
  Users, 
  UserCheck,
  FileText, 
  Wallet,
  AlertTriangle,
  Settings,
  LogOut,
  ChevronRight,
  Crown,
  BarChart3,
  Factory,
  Receipt,
  ShieldAlert,
  History,
  HelpCircle
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/admin", label: "Tableau de Bord", icon: LayoutDashboard },
  { href: "/admin/buyers", label: "Acheteurs", icon: Users },
  { href: "/admin/partners", label: "Partenaires", icon: UserCheck },
  { href: "/admin/suppliers", label: "Fournisseurs", icon: Factory },
  { href: "/admin/transactions", label: "Transactions", icon: Receipt },
  { href: "/admin/risks", label: "Gestion des Risques", icon: ShieldAlert },
  { href: "/admin/audit", label: "Journal d'Audit", icon: History, badge: 5 },
  { href: "/admin/settings", label: "Paramètres", icon: Settings },
  { href: "/admin/support", label: "Support", icon: HelpCircle },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-6">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight">
              ALPHA<span className="text-gradient-gold">IX</span>
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/admin" && pathname.startsWith(item.href))
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                    isActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/20" 
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive ? "text-primary-foreground" : "text-primary")} />
                  {item.label}
                  {item.badge && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                      {item.badge}
                    </span>
                  )}
                  {!item.badge && isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-3 mt-auto space-y-1 border-t border-sidebar-border">
        <Link
          href="/admin/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          <Settings className="w-5 h-5 text-primary" />
          Réglages
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground w-full transition-colors"
        >
          <LogOut className="w-5 h-5 text-primary" />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
