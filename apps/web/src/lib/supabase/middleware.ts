import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env'

/**
 * Supabase SSR client used inside `middleware.ts`.
 *
 * Unlike the server/client `createClient`, this variant always writes refreshed
 * auth cookies back onto the outgoing `NextResponse`, so public-session refreshes
 * work before any page or route runs. It intentionally does not call
 * `assertSupabaseConfigured` — middleware runs even when Supabase is unset, in
 * which case it simply does nothing and returns the request untouched.
 *
 * @param request  the incoming NextRequest
 * @param response an existing response to carry cookie writes onto (optional)
 */
export function createMiddlewareClient(request: NextRequest, response?: NextResponse) {
  const res = response ?? NextResponse.next({ request })

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
        for (const [key, value] of Object.entries(headers)) {
          res.headers.set(key, value)
        }
      },
    },
  })

  return { supabase, response: res }
}
