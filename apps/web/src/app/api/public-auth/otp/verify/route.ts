import { NextResponse } from 'next/server'
import { verifyPhoneOtp } from '@/lib/mock-supabase'
import { createPublicSessionToken, PUBLIC_SESSION_COOKIE } from '@/lib/public-auth'

const PHONE_RE = /^\+?\d{7,15}$/

export async function POST(request: Request) {
  let phone = ''
  let code = ''
  try {
    const body = (await request.json()) as { phone?: string; code?: string }
    phone = String(body.phone ?? '').trim()
    code = String(body.code ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (!PHONE_RE.test(phone) || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Enter the 6-digit code sent to your phone' }, { status: 400 })
  }
  const user = verifyPhoneOtp(phone, code)
  if (!user) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(PUBLIC_SESSION_COOKIE, createPublicSessionToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  })
  return res
}
