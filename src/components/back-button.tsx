"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface BackButtonProps {
  className?: string
  variant?: "ghost" | "outline" | "default" | "secondary"
  label?: string
  href?: string
}

export function BackButton({ 
  className, 
  variant = "ghost", 
  label = "Retour",
  href
}: BackButtonProps) {
  const router = useRouter()

  if (href) {
    return (
      <Button
        variant={variant}
        size="sm"
        asChild
        className={cn("gap-2 hover:bg-primary/10 transition-colors", className)}
      >
        <Link href={href}>
          <ChevronLeft className="w-4 h-4" />
          {label}
        </Link>
      </Button>
    )
  }

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={() => router.back()}
      className={cn("gap-2 hover:bg-primary/10 transition-colors", className)}
    >
      <ChevronLeft className="w-4 h-4" />
      {label}
    </Button>
  )
}
