import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from './server'
import { prisma } from '@pil/db'

/**
 * Real Supabase auth helpers (used when the public Supabase keys are set).
 *
 * These run on the server (Route Handlers / Server Actions / Server Components)
 * through the SSR client. Supabase owns session cookies; this module only
 * marshals the Supabase API calls and keeps the Prisma `User` row in step so the
 * rest of the app (contributions, backers, follows) can keep associating by
 * email — matching how the mock path upserts a row too.
 */

export interface SupabaseUserView {
  id: string
  email: string
  name: string | null
  provider: 'google' | 'email'
}

function toView(raw: { id: string; email?: string | null; user_metadata?: { full_name?: string | null; name?: string | null } }): SupabaseUserView {
  return {
    id: raw.id,
    email: raw.email ?? '',
    name: raw.user_metadata?.full_name ?? raw.user_metadata?.name ?? null,
    provider: 'google',
  }
}

/**
 * Request a 6-digit email OTP. Supabase emails the code; returns true when sent.
 */
export async function requestEmailOtp(email: string): Promise<{ sent: boolean }> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({ email })
  if (error) throw new Error(error.message)
  return { sent: true }
}

/**
 * Verify an email OTP and return the session user view. On success this also
 * upserts the matching Prisma `User` row (role BACKER by default) server-side.
 */
export async function verifyEmailOtp(
  email: string,
  token: string,
  clientOverride?: SupabaseClient,
): Promise<SupabaseUserView> {
  const supabase = clientOverride ?? (await createClient())
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  if (error || !data.user) throw new Error(error?.message ?? 'Could not verify the code')
  const view = {
    id: data.user.id,
    email: data.user.email ?? email,
    name: data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? null,
    provider: 'email' as const,
  }
  await upsertPrismaUser(view)
  return view
}

/**
 * Start a Google OAuth flow. Returns a URL the caller should redirect the user
 * to. After the redirect, the `/api/public-auth/google/callback` route handles
 * the code exchange with `supabase.auth.exchangeCodeForSession`.
 */
export async function signInWithGoogle(
  redirectTo: string,
  clientOverride?: SupabaseClient,
): Promise<{ url: string }> {
  const supabase = clientOverride ?? (await createClient())
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })
  if (error || !data.url) throw new Error(error?.message ?? 'Could not start Google sign-in')
  return { url: data.url }
}

/** Exchange the Google OAuth callback code for a session. */
export async function exchangeGoogleCode(
  code: string,
  clientOverride?: SupabaseClient,
): Promise<SupabaseUserView | null> {
  const supabase = clientOverride ?? (await createClient())
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.user) return null
  const view = toView(data.user as Parameters<typeof toView>[0])
  await upsertPrismaUser(view)
  return view
}

/** Resolve the current session user (null if none). */
export async function getSupabaseUser(clientOverride?: SupabaseClient): Promise<SupabaseUserView | null> {
  const supabase = clientOverride ?? (await createClient())
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return toView(data.user as Parameters<typeof toView>[0])
}

/** Sign out the current Supabase session. */
export async function signOutSupabase(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
}

async function upsertPrismaUser(view: SupabaseUserView): Promise<void> {
  await prisma.user.upsert({
    where: { email: view.email },
    update: { name: view.name ?? undefined },
    create: { email: view.email, name: view.name, role: 'BACKER' },
  })
}
