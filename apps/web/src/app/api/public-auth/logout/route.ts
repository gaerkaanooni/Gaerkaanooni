import { NextResponse } from 'next/server'
import { PUBLIC_SESSION_COOKIE } from '@/lib/public-auth'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(PUBLIC_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return res
}
