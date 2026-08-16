import { cookies } from 'next/headers'
import crypto from 'crypto'
import {
  requestEmailOtp as mockRequestOtp,
  verifyEmailOtp as mockVerifyOtp,
  signInWithGoogleMock,
  isSupabaseConfigured,
  type PublicIdentity,
} from './mock-supabase'

/**
 * Unified public-auth seam.
 *
 * The rest of the app (API routes, LoginGate) calls these functions and never
 * reaches into Supabase or the mock directly. When the Supabase keys are present
 * the real `lib/supabase/*` clients are used and Supabase owns the session
 * cookies; otherwise the deterministic mock runs and the app signs its own
 * HMAC `pil_session` cookie. Local dev, the offline unit suite and e2e tests
 * therefore all work with zero external accounts.
 *
 * The public login is **email OTP + Google** (Supabase's free tier emails OTPs at
 * no cost; SMS would require a paid phone provider).
 */

export const PUBLIC_SESSION_COOKIE = 'pil_session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

function secret(): string {
  return process.env.AUTH_SECRET ?? process.env.PUBLIC_SESSION_SECRET ?? 'pil-public-session-dev-secret'
}

function sign(data: string): Buffer {
  return crypto.createHmac('sha256', secret()).update(data).digest()
}

export function createPublicSessionToken(user: PublicIdentity): string {
  const payload = { ...user, iat: Date.now(), exp: Date.now() + SESSION_TTL_MS }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${sign(body).toString('base64url')}`
}

export async function readPublicSession(): Promise<PublicIdentity | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(PUBLIC_SESSION_COOKIE)?.value
  if (!raw) return null
  const [body, sig] = raw.split('.')
  if (!body || !sig) return null
  const expected = sign(body)
  const provided = Buffer.from(sig ?? '', 'base64url')
  if (Buffer.byteLength(expected) !== provided.length) return null
  if (!crypto.timingSafeEqual(expected, provided)) return null
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as PublicIdentity & {
      exp?: number
    }
    if (typeof parsed.exp !== 'number' || parsed.exp < Date.now()) return null
    if (parsed.provider !== 'email' && parsed.provider !== 'google') return null
    return {
      id: String(parsed.id),
      email: parsed.email ?? null,
      name: String(parsed.name),
      provider: parsed.provider,
    }
  } catch {
    return null
  }
}

/**
 * Request an OTP for the given email. Returns `{ sent, devCode }` — `devCode` is
 * only present (and only consumed by the UI) when running the mock, so it can be
 * shown to the user instead of being emailed.
 */
export async function requestOtp(email: string): Promise<{ sent: true; devCode?: string }> {
  if (isSupabaseConfigured()) {
    const { requestEmailOtp } = await import('./supabase/auth')
    await requestEmailOtp(email)
    return { sent: true }
  }
  return mockRequestOtp(email)
}

/**
 * Verify an OTP. In mock mode it writes the signed `pil_session` cookie. In real
 * mode it calls Supabase, which persists its own auth cookies.
 */
export async function verifyOtp(email: string, code: string): Promise<{ ok: true }> {
  if (isSupabaseConfigured()) {
    const { verifyEmailOtp } = await import('./supabase/auth')
    await verifyEmailOtp(email, code)
    return { ok: true }
  }
  const user = mockVerifyOtp(email, code)
  if (!user) {
    throw new Error('Invalid or expired code')
  }
  const cookieStore = await cookies()
  cookieStore.set(PUBLIC_SESSION_COOKIE, createPublicSessionToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  })
  return { ok: true }
}

/**
 * Start Google sign-in. In real mode returns a URL to redirect the user to
 * (Supabase authorization server). In mock mode completes instantly, writes the
 * session cookie, and returns `{ url: '', mock: true }`.
 */
export async function signInWithGoogle(options: {
  redirectTo: string
}): Promise<{ url: string; mock?: boolean }> {
  if (isSupabaseConfigured()) {
    const { signInWithGoogle } = await import('./supabase/auth')
    return signInWithGoogle(options.redirectTo)
  }
  const cookieStore = await cookies()
  cookieStore.set(PUBLIC_SESSION_COOKIE, createPublicSessionToken(signInWithGoogleMock()), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  })
  return { url: '', mock: true }
}

/** Resolve the current public session user, if any. */
export async function getPublicUser(): Promise<PublicIdentity | null> {
  if (isSupabaseConfigured()) {
    const { getSupabaseUser } = await import('./supabase/auth')
    const user = await getSupabaseUser()
    return user ? { id: user.id, email: user.email, name: user.name ?? '', provider: user.provider } : null
  }
  return readPublicSession()
}

/** Clear the current public session. */
export async function signOutPublic(): Promise<void> {
  if (isSupabaseConfigured()) {
    const { signOutSupabase } = await import('./supabase/auth')
    await signOutSupabase()
    return
  }
  const cookieStore = await cookies()
  cookieStore.set(PUBLIC_SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 })
}
