"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import { 
  LayoutDashboard, 
  FileText, 
  Package,
  Upload,
  MessageSquare,
  Settings,
  LogOut,
  ChevronRight,
  MapPin,
  Shield
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/partner", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/partner/requests", label: "Dossiers assignés", icon: FileText },
  { href: "/partner/suppliers", label: "Fournisseurs", icon: Package },
  { href: "/partner/proofs", label: "Upload preuves", icon: Upload },
  { href: "/partner/messages", label: "Messagerie", icon: MessageSquare },
  { href: "/partner/settings", label: "Paramètres", icon: Settings },
]

export function PartnerSidebar() {
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
        <Link href="/partner" className="flex items-center group">
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

      <div className="px-3 mb-4">
        <div className="px-3 py-2 rounded-lg bg-chart-2/10 border border-chart-2/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-chart-2/20 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-chart-2" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-chart-2">Partenaire Local</p>
              <p className="text-xs text-muted-foreground">🇨🇳 Chine</p>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/partner" && pathname.startsWith(item.href))
            
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
