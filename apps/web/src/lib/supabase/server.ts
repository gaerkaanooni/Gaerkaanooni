import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY, assertSupabaseConfigured } from './env'

/**
 * Server-side Supabase client for use in Server Components, Route Handlers and
 * Server Actions.
 *
 * Always create a fresh client per request — never share one across requests.
 * Auth cookies are read from the incoming request and, when a token refresh
 * happens, written back to the response via the `setAll` hook so the refreshed
 * session is persisted. This is the `getAll`/`setAll` contract recommended by
 * Supabase SSR; the obsolete `get`/`set`/`remove` contract is avoided.
 *
 * `setAll` can throw from a Server Component because cookies cannot be mutated
 * there; the Supabase docs recommend relying on middleware for refreshes in
 * that case, so the throw is swallowed. Route Handlers and Server Actions can
 * also surface the returned response headers themselves if they need to — see
 * `lib/supabase/route.ts` for that variant.
 *
 * @example
 *   const supabase = await createClient()
 *   const { data: { user } } = await supabase.auth.getUser()
 */
export async function createClient(): Promise<SupabaseClient> {
  assertSupabaseConfigured()
  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Component cannot mutate cookies; middleware handles refresh.
        }
      },
    },
  })
}
