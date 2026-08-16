import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_URL, SUPABASE_ANON_KEY, assertSupabaseConfigured } from './env'

/**
 * Browser-side Supabase client for client components (the public sign-in gate,
 * contribution forms, document uploads that interact with auth).
 *
 * Cookie handling is automatic via `createBrowserClient`; a singleton is used
 * so repeated imports share one instance and one auth listener.
 */
export function browserClient() {
  assertSupabaseConfigured()
  return createBrowserClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string, {
    isSingleton: true,
  })
}
