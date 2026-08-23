import { cookies } from 'next/headers'
import crypto from 'crypto'
import { prisma } from '@pil/db'
import type { Role } from '@pil/domain'
import { isSupabaseConfigured } from './supabase/env'
import { STAFF_SESSION_COOKIE } from './constants'

/**
 * Unified staff session resolution.
 *
 * The whole platform now runs on ONE auth provider (Supabase): public users use
 * email-OTP + Google, staff use email + password — both on Supabase. This module
 * is the single server-side access point for the staff identity + role.
 *
 * - Supabase configured: read the Supabase session (set by `signInWithPassword`)
 *   and resolve the staff `Role` from the Prisma `User` row by email.
 * - Not configured (offline dev / tests): fall back to a signed mock staff cookie
 *   so the whole flow (login → dashboard guard → requireRole) works with zero
 *   external accounts, matching the public mock pattern.
 *
 * Auth.js is removed; `AUTH_SECRET` now signs the offline mock staff cookie.
 */

export interface StaffSession {
  userId: string
  email: string
  name: string | null
  role: Role
}

export { STAFF_SESSION_COOKIE }
const STAFF_TTL_MS = 30 * 24 * 60 * 60 * 1000

function secret(): string {
  return process.env.AUTH_SECRET ?? process.env.PUBLIC_SESSION_SECRET ?? 'pil-staff-session-dev-secret'
}

function sign(data: string): Buffer {
  return crypto.createHmac('sha256', secret()).update(data).digest()
}

/** Issue a signed mock staff cookie (offline mode only). */
function createMockStaffCookie(email: string): string {
  const payload = { email, iat: Date.now(), exp: Date.now() + STAFF_TTL_MS }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${sign(body).toString('base64url')}`
}

/** Resolve role from the Prisma User row for an email (null if no such user). */
async function resolveStaffByEmail(email: string): Promise<StaffSession | null> {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return null
  const role = user.role as Role
  return { userId: user.id, email: user.email, name: user.name, role }
}

/**
 * Current staff session, or null. Supabase path reads the live session; mock
 * path reads the signed `pil_staff_session` cookie. Both resolve role from Prisma.
 */
export async function getStaffSession(): Promise<StaffSession | null> {
  if (isSupabaseConfigured()) {
    const { getSupabaseUser } = await import('./supabase/auth')
    const supabaseUser = await getSupabaseUser()
    if (!supabaseUser) return null
    return resolveStaffByEmail(supabaseUser.email)
  }

  const cookieStore = await cookies()
  const raw = cookieStore.get(STAFF_SESSION_COOKIE)?.value
  if (!raw) return null
  const [body, sig] = raw.split('.')
  if (!body || !sig) return null
  const expected = sign(body)
  const provided = Buffer.from(sig ?? '', 'base64url')
  if (Buffer.byteLength(expected) !== provided.length) return null
  if (!crypto.timingSafeEqual(expected, provided)) return null
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { email?: string; exp?: number }
    if (typeof parsed.exp !== 'number' || parsed.exp < Date.now() || !parsed.email) return null
    return resolveStaffByEmail(parsed.email)
  } catch {
    return null
  }
}

/**
 * Sign a staff member in. Returns a StaffSession, or null on bad credentials.
 */
export async function signInStaff(email: string, password: string): Promise<StaffSession | null> {
  const cleanEmail = email.trim().toLowerCase()

  if (isSupabaseConfigured()) {
    const { signInWithStaffPassword } = await import('./supabase/auth')
    const supaUser = await signInWithStaffPassword(cleanEmail, password)
    if (!supaUser) return null
    return resolveStaffByEmail(cleanEmail)
  }

  // Offline mock: verify against the bcrypt hash stored on the Prisma User row.
  const { verifyCredentials } = await import('@pil/db')
  const user = await verifyCredentials(prisma, cleanEmail, password)
  if (!user) return null
  const cookieStore = await cookies()
  cookieStore.set(STAFF_SESSION_COOKIE, createMockStaffCookie(user.email), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60,
  })
  return resolveStaffByEmail(cleanEmail)
}

/** Sign the current staff member out. */
export async function signOutStaff(): Promise<void> {
  if (isSupabaseConfigured()) {
    const { signOutSupabase } = await import('./supabase/auth')
    await signOutSupabase()
    return
  }
  const cookieStore = await cookies()
  cookieStore.set(STAFF_SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 })
}
