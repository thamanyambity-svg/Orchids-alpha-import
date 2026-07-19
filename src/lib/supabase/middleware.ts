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

  // Non authentifié sur une zone protégée -> login.
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

    // Pas de profil/rôle exploitable : on renvoie vers /login (sans boucle).
    if (!role) {
      if (!isAuthPage) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
      }
      return supabaseResponse
    }

    const home =
      role === 'ADMIN' ? '/admin' : role === 'PARTNER' ? '/partner' : '/dashboard'

    // Déjà connecté sur une page d'auth -> dirige vers son espace.
    if (isAuthPage) {
      const url = request.nextUrl.clone()
      url.pathname = home
      return NextResponse.redirect(url)
    }

    // Le rôle doit correspondre à la zone demandée, sinon redirection vers son espace.
    const allowed =
      (isAdminArea && role === 'ADMIN') ||
      (isPartnerArea && role === 'PARTNER') ||
      (isBuyerArea && role === 'BUYER')

    if (!allowed) {
      const url = request.nextUrl.clone()
      url.pathname = home
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
