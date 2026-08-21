import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Échange le code PKCE après clic sur le lien reçu par email (réinitialisation de
 * mot de passe, confirmation d'inscription). Les cookies de session sont posés sur
 * la réponse de redirection, sans quoi la page de destination verrait un visiteur
 * anonyme.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const code = url.searchParams.get('code')
  let next = url.searchParams.get('next') ?? '/'

  // `next` vient de l'URL : on n'accepte qu'un chemin interne, jamais une
  // redirection vers un autre domaine.
  if (!next.startsWith('/') || next.startsWith('//')) {
    next = '/'
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=auth-missing-code', url.origin))
  }

  const response = NextResponse.redirect(new URL(next, url.origin))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback]', error.message)
    return NextResponse.redirect(new URL('/login?error=auth-callback', url.origin))
  }

  return response
}
