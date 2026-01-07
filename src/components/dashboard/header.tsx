"use client"

import { Bell, Search, Home } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BackButton } from "@/components/back-button"

interface DashboardHeaderProps {
  title: string
  subtitle?: string
  showBackButton?: boolean
}

export function DashboardHeader({ title, subtitle, showBackButton = true }: DashboardHeaderProps) {
  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        {showBackButton && <BackButton className="h-8" variant="outline" label="" />}
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="hidden sm:flex gap-2">
          <Link href="/">
            <Home className="w-4 h-4" />
            Site public
          </Link>
        </Button>
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher..." 
            className="w-64 pl-9 h-9 bg-secondary/50"
          />
        </div>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
        </Button>
      </div>
    </header>
  )
}
