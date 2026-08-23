'use client'

import { useState } from 'react'
import { track } from '@/lib/analytics'

type Intent = 'back' | 'submit' | 'help' | null

const OPTIONS: { id: Exclude<Intent, null>; title: string; body: string; dst: string; cta: string }[] = [
  {
    id: 'back',
    title: 'Back a matter',
    body: 'Fund a legal case that needs to reach court. You are only charged if it meets its goal — otherwise a full refund.',
    dst: '/login?intent=back',
    cta: 'Sign in to back',
  },
  {
    id: 'submit',
    title: 'Submit my own matter',
    body: 'Have a legal matter that needs a hearing? You do not need a lawyer to start — volunteer lawyers will review it.',
    dst: '/login?intent=submit',
    cta: 'Start a submission',
  },
  {
    id: 'help',
    title: 'Help someone else',
    body: 'Know someone who needs a fair hearing but may not have asked for help? You can put it forward, and stay anonymous if you like.',
    dst: '/login?intent=help',
    cta: 'Refer someone',
  },
]

/**
 * First-time registration / join page. Rather than a dead landing, it captures
 * the visitor's intent and routes them into the (unified) email-OTP / Google
 * sign-in with a tailored next step. Dignity-first: no labels on anyone's
 * circumstances — a person is simply a person getting a fair chance to be heard.
 */
export default function RegisterIntro() {
  const [intent, setIntent] = useState<Intent>(null)

  function choose(next: Exclude<Intent, null>) {
    setIntent(next)
    void track({ name: 'signup_intent', props: { intent: next } })
    window.location.href = OPTIONS.find((o) => o.id === next)!.dst
  }

  return (
    <main className="narrow">
      <section className="hero reveal">
        <p className="kicker">It costs nothing to join</p>
        <h1>What would you like to do?</h1>
        <p className="lede">
          Signing in is free and takes less than a minute with an email code or Google. Your details are never sold,
          and no one is ever reduced to a label here.
        </p>
      </section>

      <div className="onboard-grid">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`onboard-card ${intent === o.id ? 'selected' : ''}`}
            onClick={() => choose(o.id)}
          >
            <span className="step-no">{o.id === 'back' ? '01' : o.id === 'submit' ? '02' : '03'}</span>
            <h2>{o.title}</h2>
            <p>{o.body}</p>
            <span className="onboard-cta">{o.cta} →</span>
          </button>
        ))}
      </div>

      <p className="gate-muted" style={{ textAlign: 'center', marginTop: 24 }}>
        {intent ? `Taking you to sign in…` : 'Pick one — you can do all three later.'}
      </p>
      <p className="gate-muted" style={{ textAlign: 'center' }}>
        Already signed in? <a href="/dashboard">Go to your account →</a>
      </p>
    </main>
  )
}
