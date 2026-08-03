/**
 * Mock Supabase auth provider.
 *
 * When `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present this module
 * should hand off to the real `@supabase/supabase-js` client (signInWithOtp / signInWithOAuth /
 * verifyOtp). Until then it runs a deterministic in-memory stub so the OTP + Google flows are
 * fully usable and testable offline:
 *   - OTP codes are returned to the client as `devCode` (shown in the UI) instead of sent via SMS.
 *   - Google "sign in" completes instantly with a mock identity instead of a redirect to Google.
 *
 * NOTE: the OTP code is derived deterministically from the phone number and a 10-minute window, so
 * the flow works with no shared server state. Replace this module's bodies with the real Supabase
 * calls when keys are configured.
 */

import crypto from 'crypto'

export interface PublicIdentity {
  id: string
  phone?: string | null
  email?: string | null
  name: string
  provider: 'phone' | 'google'
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    typeof process !== 'undefined' &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}

const OTP_TTL_MS = 10 * 60 * 1000

// Deterministic OTP: derived from phone + the current time window, so request and verify agree
// without any shared in-memory state (which would be per-module-instance in dev). Same phone in
// the same 10-minute window yields the same code — fine for a mock.
function windowStart(nowMs: number): number {
  return Math.floor(nowMs / OTP_TTL_MS) * OTP_TTL_MS
}

function otpFor(phone: string, windowMs: number): string {
  const digest = crypto.createHmac('sha256', `mock-otp:${phone}`).update(String(windowMs)).digest('hex')
  return String(parseInt(digest.slice(0, 8), 16)).slice(-6).padStart(6, '0')
}

export type RequestOtpResult = { sent: true; devCode?: string }

export function requestPhoneOtp(phone: string): RequestOtpResult {
  if (isSupabaseConfigured()) {
    // Real integration: supabase.auth.signInWithOtp({ phone, channel: 'sms' })
    return { sent: true }
  }
  return { sent: true, devCode: otpFor(phone, windowStart(Date.now())) }
}

export function verifyPhoneOtp(phone: string, code: string): PublicIdentity | null {
  const now = Date.now()
  const current = otpFor(phone, windowStart(now))
  const previous = otpFor(phone, windowStart(now) - OTP_TTL_MS)
  const normalized = code.trim()
  if (normalized !== current && normalized !== previous) return null
  return {
    id: `user_phone_${phone.replace(/\D/g, '')}`,
    phone,
    name: 'Citizen',
    provider: 'phone',
  }
}

export function signInWithGoogle(): PublicIdentity {
  if (isSupabaseConfigured()) {
    // Real integration: supabase.auth.signInWithOAuth({ provider: 'google' }) starts a redirect
    // to Google; the callback exchanges the code for a session. Until that exists we stay in mock.
  }
  return {
    id: 'user_google_mock',
    email: 'citizen@google.example',
    name: 'Google Citizen',
    provider: 'google',
  }
}
