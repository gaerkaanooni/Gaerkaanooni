import { NextResponse } from 'next/server'
import { verifyOtp } from '@/lib/public-auth'
import { guardRateLimit } from '@/lib/rateLimit'

export async function POST(request: Request) {
  // Guard against OTP brute-force guesses: tight limit per IP.
  const tooMany = guardRateLimit({ request, discriminator: 'otp-verify', limit: 10, windowMs: 5 * 60_000 })
  if (tooMany) return tooMany

  let email = ''
  let code = ''
  try {
    const body = (await request.json()) as { email?: string; code?: string }
    email = String(body.email ?? '').trim().toLowerCase()
    code = String(body.code ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Enter the 6-digit code sent to your email' }, { status: 400 })
  }
  try {
    await verifyOtp(email, code)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid or expired code'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
