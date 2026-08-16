/**
 * Mock Supabase auth provider (offline / tests).
 *
 * When `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present,
 * auth flows delegate to the real Supabase clients in `lib/supabase/`. Until then
 * this module runs a deterministic in-memory stub so the **email** OTP + Google
 * flows are fully usable and testable offline:
 *   - OTP codes are returned to the client as `devCode` (shown in the UI) instead
 *     of being emailed.
 *   - Google "sign-in" completes instantly with a mock identity instead of a
 *     redirect to Google.
 *
 * The OTP code is derived deterministically from the email and a 10-minute window
 * so the flow works with no shared server state.
 */

import crypto from 'crypto'

export interface PublicIdentity {
  id: string
  email?: string | null
  name: string
  provider: 'email' | 'google'
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    typeof process !== 'undefined' &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}

const OTP_TTL_MS = 10 * 60 * 1000

function windowStart(nowMs: number): number {
  return Math.floor(nowMs / OTP_TTL_MS) * OTP_TTL_MS
}

function otpFor(email: string, windowMs: number): string {
  const digest = crypto
    .createHmac('sha256', `mock-otp:${email.toLowerCase().trim()}`)
    .update(String(windowMs))
    .digest('hex')
  return String(parseInt(digest.slice(0, 8), 16)).slice(-6).padStart(6, '0')
}

export type RequestOtpResult = { sent: true; devCode?: string }

export function requestEmailOtp(email: string): RequestOtpResult {
  if (isSupabaseConfigured()) {
    return { sent: true }
  }
  return { sent: true, devCode: otpFor(email, windowStart(Date.now())) }
}

export function verifyEmailOtp(email: string, code: string): PublicIdentity | null {
  if (isSupabaseConfigured()) {
    // Real path handled by lib/supabase/auth.ts; the mock never reaches here when configured.
    return null
  }
  const now = Date.now()
  const current = otpFor(email, windowStart(now))
  const previous = otpFor(email, windowStart(now) - OTP_TTL_MS)
  const normalized = code.trim()
  if (normalized !== current && normalized !== previous) return null
  return {
    id: `user_email_${email.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
    email,
    name: 'Citizen',
    provider: 'email',
  }
}

export function signInWithGoogleMock(): PublicIdentity {
  return {
    id: 'user_google_mock',
    email: 'citizen@google.example',
    name: 'Google Citizen',
    provider: 'google',
  }
}
