"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type Role = 'ADMIN' | 'PARTNER' | 'BUYER'

interface RoleGuardProps {
    children: React.ReactNode
    allowedRoles: Role[]
}

const ACCUEIL: Record<Role, string> = { ADMIN: '/admin', PARTNER: '/partner', BUYER: '/dashboard' }
const LIBELLE_ROLE: Record<Role, string> = { ADMIN: 'administrateur', PARTNER: 'partenaire', BUYER: 'client' }
const ESPACES: Record<string, string> = {
    admin: "l'espace administration",
    partner: "l'espace partenaire",
    client: "l'espace client",
}

const CONSEIL =
    "Un navigateur ne garde qu'un compte connecté à la fois. Pour suivre deux espaces en même temps, ouvrez l'autre dans une fenêtre de navigation privée."

/**
 * Garde d'espace, côté navigateur.
 *
 * Un navigateur ne garde qu'une session. Se connecter en client dans un
 * onglet déconnectait l'administrateur de ses autres onglets, qui échouaient
 * ensuite sans explication ; et l'administrateur qui ouvrait l'espace client
 * était renvoyé sur /admin en silence. Des deux côtés, l'espace semblait
 * cassé. La garde suit désormais les changements de session et dit ce qui se
 * passe.
 */
export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
    const [loading, setLoading] = useState(true)
    const [authorized, setAuthorized] = useState(false)
    const router = useRouter()
    const compte = useRef<string | null>(null)
    const roles = allowedRoles.join(',')

    useEffect(() => {
        const supabase = createClient()
        const autorises = roles.split(',') as Role[]
        let actif = true

        async function verifier(apresChangement: boolean) {
            const { data: { user } } = await supabase.auth.getUser()
            if (!actif) return

            if (!user) {
                router.push('/login?erreur=session')
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle()
            if (!actif) return

            // Profil illisible : ne pas renvoyer vers /dashboard. Pour un
            // acheteur, /dashboard est la page même que cette garde protège —
            // le renvoi tournait en boucle, écran de chargement sans fin.
            if (!profile) {
                router.push('/login?erreur=profil')
                return
            }

            const role = profile.role as Role
            if (!autorises.includes(role)) {
                if (apresChangement) {
                    toast.info(
                        `Ce navigateur est maintenant connecté avec un compte ${LIBELLE_ROLE[role] ?? ''}. ${CONSEIL}`,
                        { duration: 15000 }
                    )
                }
                router.push(ACCUEIL[role] ?? '/login')
                return
            }

            compte.current = user.id
            setAuthorized(true)
            setLoading(false)
        }

        verifier(false)

        // Raison d'un renvoi par le middleware, affichée une fois puis retirée
        // de l'adresse.
        const params = new URLSearchParams(window.location.search)
        const refus = params.get('refus')
        if (refus && ESPACES[refus]) {
            toast.info(
                `Le compte connecté n'a pas accès à ${ESPACES[refus]}. Déconnectez-vous pour changer de compte. ${CONSEIL}`,
                { duration: 15000 }
            )
        } else if (params.get('deja')) {
            toast.info(`Vous êtes déjà connecté. Pour ouvrir un autre compte, déconnectez-vous d'abord. ${CONSEIL}`, {
                duration: 15000,
            })
        }
        if (refus || params.get('deja')) {
            params.delete('refus')
            params.delete('deja')
            const reste = params.toString()
            window.history.replaceState(null, '', window.location.pathname + (reste ? `?${reste}` : ''))
        }

        // Changement de compte dans un autre onglet du même navigateur.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!actif) return
            if (event === 'SIGNED_OUT') {
                compte.current = null
                setAuthorized(false)
                router.push('/login')
                return
            }
            const id = session?.user?.id ?? null
            if (id && compte.current && id !== compte.current) {
                compte.current = null
                setAuthorized(false)
                setLoading(true)
                verifier(true)
            }
        })

        return () => {
            actif = false
            subscription.unsubscribe()
        }
    }, [router, roles])

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
