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
  BarChart3
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/buyers", label: "Acheteurs", icon: Users },
  { href: "/admin/partners", label: "Partenaires", icon: UserCheck },
  { href: "/admin/requests", label: "Demandes", icon: FileText },
  { href: "/admin/finances", label: "Flux financiers", icon: Wallet },
  { href: "/admin/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/admin/reporting", label: "Reporting & Audit", icon: BarChart3 },
  { href: "/admin/settings", label: "Paramètres", icon: Settings },
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

      <div className="px-3 mb-4">
        <div className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Crown className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-primary">Administration</p>
              <p className="text-xs text-muted-foreground">Accès complet</p>
            </div>
          </div>
        </div>
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
                      ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent w-full transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
