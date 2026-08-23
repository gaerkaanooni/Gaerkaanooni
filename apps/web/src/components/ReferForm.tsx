'use client'

import { useState } from 'react'
import { VALID_CATEGORIES, categoryLabel, type CategoryName } from '@pil/domain'
import { track } from '@/lib/analytics'

/**
 * Referral intake. Copy is deliberately gentle and non-labeling: the person being
 * referred is only ever a "someone who needs a fair hearing" — never a tag. No
 * account is required, and their contact is only stored if they have consented.
 */
export default function ReferForm() {
  const [form, setForm] = useState({
    referredFor: '',
    matter: '',
    category: '',
    region: '',
    contact: '',
    contactConsented: false,
    referrer: '',
    referrerContact: '',
  })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.referredFor.trim() || !form.matter.trim()) {
      setError('Please tell us who needs a hearing and what is going on.')
      return
    }
    setError('')
    setStatus('submitting')
    try {
      const res = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referredFor: form.referredFor,
          matter: form.matter,
          category: form.category || null,
          region: form.region || null,
          contact: form.contact || null,
          contactConsented: form.contactConsented,
          referrer: form.referrer || null,
          referrerContact: form.referrerContact || null,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Could not submit')
      void track({ name: 'referral_submitted', props: { category: form.category || 'unknown' } })
      setStatus('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="about-teaser reveal">
        <p className="kicker">Thank you</p>
        <h2>We have received your referral</h2>
        <p>
          Our volunteer lawyers will review it and reach out in a way that is right for the situation. No one's
          dignity is part of this process — a person is simply getting a fair chance to be heard.
        </p>
        <a href="/" className="button">
          Back to the docket →
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor="ref-for">Who needs a fair hearing?</label>
      <input
        id="ref-for"
        value={form.referredFor}
        onChange={(e) => setForm({ ...form, referredFor: e.target.value })}
        placeholder="Their name or initials — whatever feels right (e.g. 'a friend', 'Anita')"
        required
      />

      <label htmlFor="ref-matter">What is the matter about?</label>
      <textarea
        id="ref-matter"
        rows={4}
        value={form.matter}
        onChange={(e) => setForm({ ...form, matter: e.target.value })}
        placeholder="Briefly, what's going on and what outcome would help? You don't need legal language — plain words are enough."
        required
      />

      <label htmlFor="ref-category">Category</label>
      <select
        id="ref-category"
        value={form.category}
        onChange={(e) => setForm({ ...form, category: e.target.value })}
      >
        <option value="">I'm not sure</option>
        {VALID_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {categoryLabel(c as CategoryName)}
          </option>
        ))}
      </select>

      <label htmlFor="ref-region">Region / city</label>
      <input
        id="ref-region"
        value={form.region}
        onChange={(e) => setForm({ ...form, region: e.target.value })}
        placeholder="Optional"
      />

      <fieldset className="gate-fieldset">
        <legend>How can we reach them?</legend>
        <label htmlFor="ref-contact">A contact for them (only if they are OK with it)</label>
        <input
          id="ref-contact"
          value={form.contact}
          onChange={(e) => setForm({ ...form, contact: e.target.value })}
          placeholder="Phone or email — optional"
        />
        <label htmlFor="ref-consent">
          <input
            id="ref-consent"
            type="checkbox"
            checked={form.contactConsented}
            onChange={(e) => setForm({ ...form, contactConsented: e.target.checked })}
          />
          They know and are happy for us to contact them
        </label>
      </fieldset>

      <label htmlFor="ref-referrer">Your name (optional)</label>
      <input
        id="ref-referrer"
        value={form.referrer}
        onChange={(e) => setForm({ ...form, referrer: e.target.value })}
      />
      <label htmlFor="ref-referrer-contact">Your contact, if we may reach you for details (optional)</label>
      <input
        id="ref-referrer-contact"
        value={form.referrerContact}
        onChange={(e) => setForm({ ...form, referrerContact: e.target.value })}
      />

      {error && (
        <p role="alert" className="gate-error">
          {error}
        </p>
      )}
      <button type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Submitting…' : 'Send this referral'}
      </button>
    </form>
  )
}
