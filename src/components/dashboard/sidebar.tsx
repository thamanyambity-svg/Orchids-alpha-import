"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { 
  Shield, 
  LayoutDashboard, 
  FileText, 
  Wallet,
  MessageSquare,
  FolderOpen,
  Settings,
  LogOut,
  ChevronRight,
  User,
  BadgeCheck
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/dashboard/requests", label: "Mes demandes", icon: FileText },
  { href: "/dashboard/payments", label: "Paiements", icon: Wallet },
  { href: "/dashboard/messages", label: "Messagerie", icon: MessageSquare },
  { href: "/dashboard/documents", label: "Documents", icon: FolderOpen },
  { href: "/dashboard/settings", label: "Mon Profil", icon: User },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
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
    router.push("/login")
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-3">
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
        <Link href="/dashboard/settings" className="block px-3 py-3 rounded-lg bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold truncate">
                  {profile?.full_name || 'Acheteur'}
                </p>
                {profile?.status === 'VERIFIED' && (
                  <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                )}
              </div>
              <p className="text-[10px] text-muted-foreground truncate">
                {profile?.company_name || profile?.email || 'Espace Acheteur'}
              </p>
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/dashboard" && pathname.startsWith(item.href))
            
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
