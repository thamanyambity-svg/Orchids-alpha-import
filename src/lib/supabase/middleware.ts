import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Skip Supabase auth when env vars are missing (avoids MIDDLEWARE_INVOCATION_FAILED on Vercel)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register')
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/admin') ||
    (request.nextUrl.pathname.startsWith('/partner') && !request.nextUrl.pathname.startsWith('/partner-request'))

  if (!user && isDashboard) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthPage) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const url = request.nextUrl.clone()
    if (profile?.role === 'ADMIN') {
      url.pathname = '/admin'
    } else if (profile?.role === 'PARTNER') {
      url.pathname = '/partner'
    } else {
      url.pathname = '/dashboard'
    }
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
