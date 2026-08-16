/**
 * Supabase environment + configuration gate.
 *
 * The whole Supabase integration is optional at runtime. When the public
 * Supabase keys are absent, the app falls back to the deterministic in-memory
 * mock (`lib/mock-supabase.ts`) so local dev and the offline test suite work
 * with zero external accounts. When the keys are present, every auth/storage
 * path uses the real Supabase API.
 *
 * Secrets never reach the browser. Values prefixed `NEXT_PUBLIC_` are safe in
 * the client bundle (anon key + project URL are public by design); everything
 * else lives only in the server runtime.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * True when the real Supabase path should be used instead of the mock.
 * Both URL and anon key must be present; the service-role key is only needed
 * for server-only operations (storage uploads) and is validated separately.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
}

/** Private bucket that holds case documents (petitions, orders, vouchers). */
export const CASE_DOCS_BUCKET = 'case-docs'

export function assertSupabaseConfigured(): void | never {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    )
  }
}
