import { NextResponse } from 'next/server'
import { signInWithGoogle } from '@/lib/public-auth'

/**
 * Start Google OAuth.
 *
 * Real mode: returns `{ url }` pointing at Supabase's Google authorization server;
 * the client redirects there. Mock mode: completes instantly and returns
 * `{ url: '', mock: true }` with a signed `pil_session` cookie set.
 *
 * The OAuth callback lives at `/api/public-auth/google/callback`.
 */
export async function POST(request: Request) {
  const origin = request.headers.get('origin') ?? 'http://localhost:3000'
  const redirectTo = new URL('/api/public-auth/google/callback', origin).toString()

  try {
    const result = await signInWithGoogle({ redirectTo })
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Google sign-in failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
