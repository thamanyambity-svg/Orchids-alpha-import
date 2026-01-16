"use client"

import { Bell, Search, Home, ChevronDown, Grid } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { BackButton } from "@/components/back-button"
import { LanguageSwitcher } from "@/components/language-switcher"

interface DashboardHeaderProps {
  title: string
  subtitle?: string
  showBackButton?: boolean
  children?: React.ReactNode
}

export function DashboardHeader({ title, subtitle, showBackButton = true, children }: DashboardHeaderProps) {
  const [profile, setProfile] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single()
        setProfile(data)
      }
    }
    fetchProfile()
  }, [])

  const firstName = profile?.full_name?.split(' ')[0] || 'Utilisateur'

  return (
    <header className="h-20 border-b border-white/5 bg-background/50 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        {showBackButton && <BackButton className="h-9 border-white/10" variant="outline" label="" />}
        <div className="hidden md:block">
          <h1 className="text-lg font-bold tracking-tight uppercase">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      {children}

      <div className="flex items-center gap-6">
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une transaction..."
            className="w-80 pl-9 h-10 bg-white/5 border-white/10 rounded-xl focus:bg-white/10 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white/5 relative">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-background" />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white/5">
            <Grid className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>

        <div className="h-8 w-[1px] bg-white/10" />

        <button className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-xl hover:bg-white/5 transition-colors group">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold tracking-tight text-white">Bonjour, {firstName} !</p>
          </div>
          <div className="relative">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 group-hover:border-primary/50 transition-colors">
              <img
                src={profile?.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop"}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary border-2 border-background flex items-center justify-center">
              <ChevronDown className="w-2.5 h-2.5 text-primary-foreground" />
            </div>
          </div>
        </button>
      </div>
    </header>
  )
}

