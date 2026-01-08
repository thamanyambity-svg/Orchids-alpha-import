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

  // Protected Routes
  const isAdminRoute = path.startsWith('/admin')
  const isPartnerRoute = path.startsWith('/partner')
  const isBuyerRoute = path.startsWith('/dashboard')
  const isProtectedRoute = isAdminRoute || isPartnerRoute || isBuyerRoute

  // 1. Unauthenticated User trying to access protected route
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2. Authenticated User Logic
  if (user) {
    // Fetch user role (Optimisation: In prod, use user_metadata to avoid DB call)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = profile?.role

    // 2a. User on Auth Page -> Redirect to their Dashboard
    if (isAuthPage) {
      const url = request.nextUrl.clone()
      if (userRole === 'ADMIN') {
        url.pathname = '/admin'
      } else if (userRole === 'PARTNER') {
        url.pathname = '/partner'
      } else {
        url.pathname = '/dashboard'
      }
      return NextResponse.redirect(url)
    }

    // 2b. Strict Role Enforcement (The "Guard" Logic)
    if (isAdminRoute && userRole !== 'ADMIN') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard' // or 403 page
      return NextResponse.redirect(url)
    }

    if (isPartnerRoute && userRole !== 'PARTNER') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    if (isBuyerRoute && userRole !== 'BUYER') {
      // Admins might want to see dashboard? For now, STRICT separation as per matrix.
      // If Admin tries to go to /dashboard, send them back to /admin
      const url = request.nextUrl.clone()
      if (userRole === 'ADMIN') url.pathname = '/admin'
      else if (userRole === 'PARTNER') url.pathname = '/partner'
      else url.pathname = '/' // Fallback
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
