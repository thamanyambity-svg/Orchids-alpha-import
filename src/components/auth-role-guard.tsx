"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { Loader2 } from "lucide-react"

type Role = 'ADMIN' | 'PARTNER' | 'BUYER'

interface RoleGuardProps {
    children: React.ReactNode
    allowedRoles: Role[]
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
    const [loading, setLoading] = useState(true)
    const [authorized, setAuthorized] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const checkAuth = async () => {
            const supabase = createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            )

            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/login')
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (!profile || !allowedRoles.includes(profile.role as Role)) {
                // Redirect based on actual role
                if (profile?.role === 'ADMIN') router.push('/admin')
                else if (profile?.role === 'PARTNER') router.push('/partner')
                else router.push('/dashboard')
                return
            }

            setAuthorized(true)
            setLoading(false)
        }

        checkAuth()
    }, [router, allowedRoles])

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!authorized) return null

    return <>{children}</>
}
