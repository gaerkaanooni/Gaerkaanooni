import { NextResponse } from 'next/server'
import { isSupabaseConfigured } from '@/lib/supabase/env'

/**
 * Google OAuth callback.
 *
 * Supabase redirects the user's browser here with `?code=...` after they approve
 * the Google consent screen. We exchange the code for a session (Supabase stores
 * the auth cookies) and send the user onward to the home page. When a session or
 * provider is missing we bounce to `/login`.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const origin = url.origin

  if (!isSupabaseConfigured()) {
    // Mock mode never redirects to Google, so reaching here is unexpected.
    return NextResponse.redirect(new URL('/login', origin))
  }

  if (!code) {
    const error = url.searchParams.get('error')
    const dest = new URL('/login', origin)
    if (error) dest.searchParams.set('auth_error', error)
    return NextResponse.redirect(dest)
  }

  const { exchangeGoogleCode } = await import('@/lib/supabase/auth')
  const user = await exchangeGoogleCode(code)
  if (!user) {
    const dest = new URL('/login', origin)
    dest.searchParams.set('auth_error', 'google')
    return NextResponse.redirect(dest)
  }

  return NextResponse.redirect(new URL('/', origin))
}
