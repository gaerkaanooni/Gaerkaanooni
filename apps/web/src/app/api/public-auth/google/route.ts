import { NextResponse } from 'next/server'
import { signInWithGoogle, isSupabaseConfigured } from '@/lib/mock-supabase'
import { createPublicSessionToken, PUBLIC_SESSION_COOKIE } from '@/lib/public-auth'

export async function POST() {
  const user = signInWithGoogle()
  const res = NextResponse.json({ ok: true, mock: !isSupabaseConfigured() })
  res.cookies.set(PUBLIC_SESSION_COOKIE, createPublicSessionToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  })
  return res
}
