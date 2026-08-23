import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'
// Edge-safe constant only — importing lib/auth-session here would pull Prisma
// into the Edge bundle and blow past Vercel's 1 MB middleware size cap.
import { STAFF_SESSION_COOKIE } from '@/lib/constants'

/**
 * Edge middleware:
 *
 *  1. **Supabase session refresh.** When the public Supabase keys are set, run the
 *     SSR client so refreshed auth cookies are written onto the response and
 *     no-cache headers applied. No-op when keys are unset.
 *
 *  2. **Staff dashboard coarse guard.** Protect `/dashboard*` behind the staff
 *     session cookie. This is a *presence* check only — the authoritative role
 *     check (which needs Prisma) happens in the page render and `requireRole`.
 *     Without a staff cookie (either a Supabase auth cookie or the mock
 *     `pil_staff_session`), redirect to `/login/staff`.
 */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // 1. Supabase session refresh (no-op when keys are unset).
  const supabaseResult = createMiddlewareClient(request)
  const res = supabaseResult?.response ?? NextResponse.next({ request })
  if (supabaseResult) {
    await supabaseResult.supabase.auth.getUser()
  }

  // 2. Staff dashboard guard (presence check).
  if (path.startsWith('/dashboard')) {
    const hasMockStaff = Boolean(request.cookies.get(STAFF_SESSION_COOKIE)?.value)
    const hasSupabaseSession = Boolean(
      request.cookies
        .getAll()
        .some((c) => c.name.startsWith('sb-') || c.name.includes('-auth-token')),
    )
    if (!hasMockStaff && !hasSupabaseSession) {
      return NextResponse.redirect(new URL('/login/staff', request.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/public-auth/:path*'],
}
