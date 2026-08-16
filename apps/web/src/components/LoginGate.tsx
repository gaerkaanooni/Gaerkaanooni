'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Step = 'email' | 'code'

export default function LoginGate() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/public-auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Could not send the code')
      if (typeof body.devCode === 'string') setDevCode(body.devCode)
      setStep('code')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the code')
    } finally {
      setBusy(false)
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/public-auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Invalid code')
      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code')
    } finally {
      setBusy(false)
    }
  }

  async function signInGoogle() {
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/public-auth/google', { method: 'POST' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Google sign-in failed')
      if (typeof body.url === 'string' && body.url) {
        // Real Supabase OAuth — browser navigates to Google's consent screen.
        window.location.href = body.url
        return
      }
      // Mock mode completes instantly.
      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="gate">
      {step === 'email' ? (
        <form onSubmit={sendOtp} className="gate-form">
          <label htmlFor="gate-email">Email address</label>
          <input
            id="gate-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error && (
            <p role="alert" className="gate-error">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send me a code'}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="gate-form">
          <p className="gate-note">
            Code sent to <strong>{email}</strong>.{' '}
            <button type="button" className="link" onClick={() => setStep('email')}>
              Change email
            </button>
          </p>
          {devCode && (
            <p className="gate-devcode">
              Mock mode — your code is <strong>{devCode}</strong>
            </p>
          )}
          <label htmlFor="gate-code">6-digit code</label>
          <input
            id="gate-code"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            required
          />
          {error && (
            <p role="alert" className="gate-error">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy}>
            {busy ? 'Checking…' : 'Sign in'}
          </button>
        </form>
      )}

      <div className="gate-divider">
        <span>or</span>
      </div>

      <button type="button" className="google-btn" onClick={signInGoogle} disabled={busy}>
        <span aria-hidden="true">G</span> Continue with Google
      </button>

      <p className="gate-muted">
        Staff? Use your email &amp; password — <a href="/login/staff">staff sign-in →</a>
      </p>
    </div>
  )
}
