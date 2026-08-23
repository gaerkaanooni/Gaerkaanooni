import { NextResponse } from 'next/server'
import { signInStaff } from '@/lib/auth-session'
import { parseJsonBody, str } from '@/lib/http'
import { guardRateLimit } from '@/lib/rateLimit'

/**
 * Staff sign-in (email + password), unified on Supabase. In offline mode this
 * verifies against the Prisma bcrypt hash and writes a signed mock cookie.
 */
export async function POST(request: Request) {
  const tooMany = guardRateLimit({ request, discriminator: 'stafflogin', limit: 8, windowMs: 60_000 })
  if (tooMany) return tooMany

  const parsed = await parseJsonBody(request)
  if (!parsed.ok) return parsed.response
  const email = str(parsed.body.email)
  const password = str(parsed.body.password)
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const session = await signInStaff(email, password)
  if (!session) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }
  return NextResponse.json({ ok: true, email: session.email, role: session.role })
}
