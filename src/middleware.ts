import { type NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'
import { limiterApi } from './lib/api-rate-limit'

export async function middleware(request: NextRequest) {
  // La limitation de débit passe avant la résolution de session : une requête
  // rejetée ne doit pas coûter un aller-retour vers la base.
  const rejet = limiterApi(request)
  if (rejet) return rejet

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
