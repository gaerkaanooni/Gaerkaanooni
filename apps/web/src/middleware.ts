import { NextResponse, type NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { createMiddlewareClient } from '@/lib/supabase/middleware'
import { canPerform, type Role } from '@pil/domain'

/**
 * Edge middleware — two responsibilities:
 *
 *  1. **Supabase public-session refresh.** When the public Supabase keys are set,
 *     run the SSR client so refreshed public-auth cookies are written onto the
 *     response (and no-cache headers applied). No-op when keys are unset.
 *
 *  2. **Staff dashboard guard.** Protect `/dashboard*` (and anything the public
 *     should not reach) behind an Auth.js staff session with the `dashboard.view`
 *     permission, redirecting unauthenticated staff to `/login`.
 *
 * The staff token is read from the `pil_staff_session` cookie (the same cookie the
 * Auth.js config writes) via `getToken`.
 */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // 1. Supabase public-session refresh (no-op when keys are unset).
  const supabaseResult = createMiddlewareClient(request)
  const res = supabaseResult?.response ?? NextResponse.next({ request })
  if (supabaseResult) {
    await supabaseResult.supabase.auth.getUser()
  }

  // 2. Staff dashboard guard.
  if (path.startsWith('/dashboard')) {
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      cookieName: 'pil_staff_session',
    })
    const role = token?.role as Role | undefined
    if (!canPerform(role, 'dashboard.view')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/public-auth/:path*'],
}
