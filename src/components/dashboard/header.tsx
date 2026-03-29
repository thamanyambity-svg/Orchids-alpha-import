"use client"

import { Bell, Search, ChevronDown, Grid } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { BackButton } from "@/components/back-button"
import { LanguageSwitcher } from "@/components/language-switcher"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DashboardHeaderProps {
  title: string
  subtitle?: string
  showBackButton?: boolean
  children?: React.ReactNode
}

export function DashboardHeader({ title, subtitle, showBackButton = true, children }: DashboardHeaderProps) {
  const [profile, setProfile] = useState<{ full_name?: string; avatar_url?: string } | null>(null)
  const [notifications, setNotifications] = useState<{ id: string; is_read: boolean; title: string; message: string; created_at: string }[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    async function fetchProfileAndNotifications() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {

        // 1. Profile (Try fetching DB, but use Metadata as potential fallback/init)
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single()

        // Robust Fallback: If DB profile is missing/loading, use Auth Metadata
        const dbProfile = data || { full_name: '', avatar_url: '' }
        const metaProfile = {
          full_name: user.user_metadata?.full_name || dbProfile.full_name,
          avatar_url: user.user_metadata?.avatar_url || dbProfile.avatar_url,
        }

        setProfile(metaProfile)
        if (error) console.warn("Profile DB fetch warning (using metadata):", error.message)


        // 2. Initial Notifications
        fetchNotifications(user.id)

        // 3. Realtime Subscription
        const channel = supabase
          .channel('header-notifications')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              console.log('🔔 New Notification:', payload.new)
              setNotifications((prev) => [payload.new as typeof prev[number], ...prev])
              setUnreadCount((prev) => prev + 1)
              // Optionally play sound
            }
          )
          .subscribe()

        return () => {
          supabase.removeChannel(channel)
        }
      }
    }
    fetchProfileAndNotifications()
  }, [])

  async function fetchNotifications(userId: string) {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (data) {
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.is_read).length)
    }
  }

  async function markAsRead(id: string) {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))

    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Partenaire Alpha'

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
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white/5 relative">
                <Bell className="w-5 h-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-background animate-pulse" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-[#0a0e14] border-white/10" align="end">
              <div className="p-4 border-b border-white/5 flex justify-between items-center">
                <h4 className="font-semibold text-white">Notifications</h4>
                {unreadCount > 0 && <span className="text-xs text-muted-foreground">{unreadCount} non lues</span>}
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    Aucune notification
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className={`p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${!n.is_read ? 'bg-blue-500/5' : ''}`}
                      onClick={() => markAsRead(n.id)}
                    >
                      <h5 className={`text-sm ${!n.is_read ? 'font-bold text-white' : 'font-medium text-gray-400'}`}>{n.title}</h5>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                      <span className="text-[10px] text-gray-500 mt-2 block">{new Date(n.created_at).toLocaleTimeString()}</span>
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

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


