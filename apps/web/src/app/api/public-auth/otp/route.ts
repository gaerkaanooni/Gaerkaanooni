import { NextResponse } from 'next/server'
import { requestOtp } from '@/lib/public-auth'
import { guardRateLimit } from '@/lib/rateLimit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  // Guard against email-bombing: max a few OTP requests per minute per IP.
  const tooMany = guardRateLimit({ request, discriminator: 'otp', limit: 5, windowMs: 60_000 })
  if (tooMany) return tooMany

  let email = ''
  try {
    const body = (await request.json()) as { email?: string }
    email = String(body.email ?? '').trim().toLowerCase()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
  }
  try {
    const result = await requestOtp(email)
    return NextResponse.json(result)
  } catch (err) {
    console.error('otp request failed:', err)
    return NextResponse.json({ error: 'Could not send the code right now. Please try again shortly.' }, { status: 502 })
  }
}
