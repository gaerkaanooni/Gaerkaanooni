'use client'

import { useState } from 'react'
import { track } from '@/lib/analytics'

/**
 * Staff sign-in (email + password). Posts to the unified Supabase/mock session
 * so the dashboard guard and role checks resolve through the same path.
 */
export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Invalid email or password')
      void track({ name: 'login_complete', props: { provider: 'password' } })
      // Hard navigation on purpose: a fresh document load can never be stranded
      // by stale client chunks after a redeploy (the "Signing in… forever" bug).
      window.location.assign('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor="email">Email</label>
      <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
