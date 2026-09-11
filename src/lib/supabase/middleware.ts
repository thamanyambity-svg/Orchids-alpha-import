import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  const isAuthPage = path.startsWith('/login') || path.startsWith('/register')
  const isAdminArea = path.startsWith('/admin')
  const isPartnerArea =
    path.startsWith('/partner') && !path.startsWith('/partner-request')
  const isBuyerArea = path.startsWith('/dashboard')
  const isProtected = isAdminArea || isPartnerArea || isBuyerArea

  // Non authentifié sur une zone protégée -> login. C'est le parcours normal
  // d'un visiteur qui clique « Accéder à la plateforme » : aucune raison n'est
  // jointe, il n'y a rien d'anormal à signaler.
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Authentifié : on résout le rôle uniquement quand c'est utile (zone protégée
  // ou page d'auth), pour appliquer le contrôle d'accès par rôle.
  if (user && (isAuthPage || isProtected)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = profile?.role as 'ADMIN' | 'PARTNER' | 'BUYER' | undefined

    // Pas de profil/rôle exploitable : on renvoie vers /login (sans boucle),
    // avec la raison. Ici la personne EST connectée : sans message, elle
    // retombait sur le formulaire, se reconnectait, retombait — sans que rien
    // ne dise quelle garde la refoulait.
    if (!role) {
      if (!isAuthPage) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('erreur', 'role')
        return NextResponse.redirect(url)
      }
      return supabaseResponse
    }

    const home =
      role === 'ADMIN' ? '/admin' : role === 'PARTNER' ? '/partner' : '/dashboard'

    // Déjà connecté sur une page d'auth -> dirige vers son espace, en disant
    // pourquoi : la personne voulait sans doute ouvrir un autre compte, et
    // un navigateur ne garde qu'une session à la fois.
    if (isAuthPage) {
      const url = request.nextUrl.clone()
      url.pathname = home
      url.search = ''
      url.searchParams.set('deja', '1')
      return NextResponse.redirect(url)
    }

    // Le rôle doit correspondre à la zone demandée, sinon redirection vers son
    // espace — avec la zone refusée. Sans elle, un administrateur qui ouvrait
    // l'espace client atterrissait en silence sur /admin et concluait que
    // l'espace client ne fonctionnait pas.
    const allowed =
      (isAdminArea && role === 'ADMIN') ||
      (isPartnerArea && role === 'PARTNER') ||
      (isBuyerArea && role === 'BUYER')

    if (!allowed) {
      const url = request.nextUrl.clone()
      url.pathname = home
      url.search = ''
      url.searchParams.set('refus', isAdminArea ? 'admin' : isPartnerArea ? 'partner' : 'client')
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
