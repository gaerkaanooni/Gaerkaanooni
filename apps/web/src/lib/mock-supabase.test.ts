import { describe, expect, it, vi, afterEach } from 'vitest'
import { requestEmailOtp, verifyEmailOtp, signInWithGoogleMock, isSupabaseConfigured } from './mock-supabase'

describe('mock-supabase OTP provider', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('reports when supabase is configured', () => {
    expect(isSupabaseConfigured()).toBe(false)
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'sb_publishable_x')
    expect(isSupabaseConfigured()).toBe(true)
  })

  it('returns a deterministic devCode for an email within a window', () => {
    const a = requestEmailOtp('citizen@example.com')
    const b = requestEmailOtp('citizen@example.com')
    expect(a.sent).toBe(true)
    expect(a.devCode).toMatch(/^\d{6}$/)
    expect(b.devCode).toBe(a.devCode)
  })

  it('derives the code case-insensitively and from the trimmed email', () => {
    expect(requestEmailOtp('  CITIZEN@Example.com ').devCode).toBe(requestEmailOtp('citizen@example.com').devCode)
  })

  it('verifies the current and previous window codes', () => {
    const code = requestEmailOtp('citizen@example.com').devCode as string
    expect(verifyEmailOtp('citizen@example.com', code)).toMatchObject({
      email: 'citizen@example.com',
      provider: 'email',
    })
  })

  it('rejects a wrong or stale code', () => {
    const code = requestEmailOtp('citizen@example.com').devCode as string
    expect(verifyEmailOtp('citizen@example.com', '000000')).toBeNull()
    expect(verifyEmailOtp('citizen@example.com', code)).not.toBeNull()
    expect(verifyEmailOtp('other@example.com', code)).toBeNull()
  })

  it('normalizes whitespace around the code', () => {
    const code = requestEmailOtp('citizen@example.com').devCode as string
    expect(verifyEmailOtp('citizen@example.com', `  ${code}  `)).not.toBeNull()
  })

  it('builds a stable user id per email', () => {
    const code = requestEmailOtp('citizen@example.com').devCode as string
    expect(verifyEmailOtp('citizen@example.com', code)?.id).toBe('user_email_citizenexamplecom')
  })

  it('provides a mock Google identity', () => {
    expect(signInWithGoogleMock()).toEqual({
      id: 'user_google_mock',
      email: 'citizen@google.example',
      name: 'Google Citizen',
      provider: 'google',
    })
  })
})