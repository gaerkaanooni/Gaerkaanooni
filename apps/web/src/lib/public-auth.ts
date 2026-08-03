import { cookies } from 'next/headers'
import crypto from 'crypto'
import type { PublicIdentity } from './mock-supabase'

export const PUBLIC_SESSION_COOKIE = 'pil_session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

function secret(): string {
  return process.env.AUTH_SECRET ?? process.env.PUBLIC_SESSION_SECRET ?? 'pil-public-session-dev-secret'
}

function sign(data: string): Buffer {
  return crypto.createHmac('sha256', secret()).update(data).digest()
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && crypto.timingSafeEqual(a, b)
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
  const provided = Buffer.from(sig, 'base64url')
  if (!safeEqual(expected, provided)) return null
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as PublicIdentity & {
      exp?: number
    }
    if (typeof parsed.exp !== 'number' || parsed.exp < Date.now()) return null
    if (parsed.provider !== 'phone' && parsed.provider !== 'google') return null
    return {
      id: String(parsed.id),
      phone: parsed.phone ?? null,
      email: parsed.email ?? null,
      name: String(parsed.name),
      provider: parsed.provider,
    }
  } catch {
    return null
  }
}
