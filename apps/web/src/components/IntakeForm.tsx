'use client'

import { useState } from 'react'
import { VALID_CATEGORIES, categoryLabel, type CategoryName } from '@pil/domain'
import { track } from '@/lib/analytics'

const CATEGORIES = VALID_CATEGORIES

/**
 * Unified intake form.
 *
 * One form, two intents:
 *  - `for === 'self'`   → a fundable case (posts to /api/campaigns).
 *  - `for === 'other'`  → referring someone else's matter (posts to /api/referrals);
 *    this mode reveals a consent-to-contact field and "who needs the hearing".
 *
 * Copy and fields adapt to the mode so a person submitting their own matter and a
 * person helping someone else each get the right framing — without a second page.
 */
export default function IntakeForm({
  initialFor = 'self',
}: {
  initialFor?: 'self' | 'other'
}) {
  const [forWhom, setForWhom] = useState<'self' | 'other'>(initialFor)
  const [form, setForm] = useState({
    title: '',
    summary: '',
    description: '',
    category: 'OTHER',
    region: '',
    goal: '',
    deadline: '',
    whatHappened: '',
    // self mode
    applicantName: '',
    contact: '',
    // other mode
    referredFor: '',
    contactConsented: false,
    referrer: '',
    referrerContact: '',
    isAnonymous: false,
  })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errors, setErrors] = useState<string[]>([])
  const [serverError, setServerError] = useState('')

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const localErrors: string[] = []
    if (forWhom === 'other') {
      if (form.referredFor.trim().length === 0) localErrors.push('Tell us who needs a hearing')
      if (form.whatHappened.trim().length === 0) localErrors.push('A narrative of what happened is required')
    } else {
      if (form.title.trim().length === 0) localErrors.push('Title is required')
      if (form.summary.trim().length === 0) localErrors.push('Summary is required')
      if (form.whatHappened.trim().length === 0) localErrors.push('A narrative of what happened is required')
      const goalRupees = Number(form.goal)
      if (!Number.isFinite(goalRupees) || goalRupees <= 0)
        localErrors.push('Goal must be a positive amount in rupees')
    }
    setErrors(localErrors)
    if (localErrors.length > 0) return

    setStatus('submitting')
    try {
      if (forWhom === 'other') {
        const res = await fetch('/api/referrals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            referredFor: form.referredFor.trim(),
            matter: form.whatHappened.trim(),
            category: form.category === 'OTHER' ? null : form.category,
            region: form.region.trim() || null,
            contact: form.contact.trim() || null,
            contactConsented: form.contactConsented,
            referrer: form.referrer.trim() || null,
            referrerContact: form.referrerContact.trim() || null,
          }),
        })
        const body = await res.json()
        if (!res.ok) throw new Error(body.error ?? 'Submission failed')
        void track({ name: 'referral_submitted', props: { category: form.category } })
        setStatus('success')
        return
      }

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryType: 'funded',
          title: form.title.trim(),
          summary: form.summary.trim(),
          description: form.description.trim() || null,
          category: form.category,
          region: form.region.trim() || null,
          goalAmountPaise: Math.round(Number(form.goal) * 100),
          deadlineAt: form.deadline ? new Date(form.deadline).toISOString() : null,
          track: 'CAMPAIGN',
          whatHappened: form.whatHappened.trim(),
          applicantName: form.applicantName.trim() || null,
          contact: form.contact.trim() || null,
          isAnonymous: form.isAnonymous,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Submission failed')
      void track({ name: 'submit_case', props: { category: form.category, track: 'CAMPAIGN' } })
      setStatus('success')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Submission failed. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="about-teaser reveal">
        <p className="kicker">{forWhom === 'other' ? 'Thank you' : 'Submission received'}</p>
        <h2>{forWhom === 'other' ? 'We have received your referral' : 'Your case has been submitted'}</h2>
        <p>
          {forWhom === 'other'
            ? 'Our volunteer lawyers will review it and reach out only in a way that is right for the situation.'
            : 'Our volunteer lawyers will review it. You do not need to do anything more right now.'}
        </p>
        <a href="/" className="button">
          Back to the docket →
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={submit}>
      <div className="intake-mode" role="group" aria-label="Who is this for?">
        <button
          type="button"
          className={forWhom === 'self' ? 'selected' : ''}
          onClick={() => setForWhom('self')}
        >
          For myself
        </button>
        <button
          type="button"
          className={forWhom === 'other' ? 'selected' : ''}
          onClick={() => setForWhom('other')}
        >
          For someone else
        </button>
      </div>

      {forWhom === 'other' ? (
        <>
          <label htmlFor="referredFor">Who needs a fair hearing?</label>
          <input
            id="referredFor"
            value={form.referredFor}
            onChange={(e) => set('referredFor', e.target.value)}
            placeholder="Their name or initials — whatever feels right"
          />
        </>
      ) : (
        <>
          <label htmlFor="title">Title</label>
          <input id="title" value={form.title} onChange={(e) => set('title', e.target.value)} />
          <label htmlFor="summary">Summary</label>
          <textarea id="summary" value={form.summary} onChange={(e) => set('summary', e.target.value)} />
          <label htmlFor="description">Full description</label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Help supporters understand the problem, who it affects, and what the court order would change."
          />
        </>
      )}

      <label htmlFor="category">Category</label>
      <select id="category" value={form.category} onChange={(e) => set('category', e.target.value)}>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {categoryLabel(c as CategoryName)}
          </option>
        ))}
      </select>

      <label htmlFor="region">Region / city</label>
      <input id="region" value={form.region} onChange={(e) => set('region', e.target.value)} />

      {forWhom === 'self' && (
        <>
          <label htmlFor="goal">Goal (₹)</label>
          <input
            id="goal"
            type="number"
            min="1"
            value={form.goal}
            onChange={(e) => set('goal', e.target.value)}
          />
          <label htmlFor="deadline">Deadline</label>
          <input
            id="deadline"
            type="date"
            value={form.deadline}
            onChange={(e) => set('deadline', e.target.value)}
          />
        </>
      )}

      <label htmlFor="whatHappened">What happened</label>
      <textarea
        id="whatHappened"
        value={form.whatHappened}
        onChange={(e) => set('whatHappened', e.target.value)}
        placeholder="Plain words are enough — you do not need legal language."
      />

      {forWhom === 'other' ? (
        <>
          <fieldset className="gate-fieldset">
            <legend>Contact &amp; privacy</legend>
            <label htmlFor="contact">A contact for them (only if they are OK with it)</label>
            <input
              id="contact"
              value={form.contact}
              onChange={(e) => set('contact', e.target.value)}
              placeholder="Phone or email — optional"
            />
            <label htmlFor="contactConsented">
              <input
                id="contactConsented"
                type="checkbox"
                checked={form.contactConsented}
                onChange={(e) => set('contactConsented', e.target.checked)}
              />
              They know and are happy for us to contact them
            </label>
          </fieldset>
          <label htmlFor="referrer">Your name (optional)</label>
          <input
            id="referrer"
            value={form.referrer}
            onChange={(e) => set('referrer', e.target.value)}
          />
          <label htmlFor="referrerContact">Your contact, if we may reach you for details (optional)</label>
          <input
            id="referrerContact"
            value={form.referrerContact}
            onChange={(e) => set('referrerContact', e.target.value)}
          />
        </>
      ) : (
        <>
          <label htmlFor="applicantName">Applicant name</label>
          <input
            id="applicantName"
            value={form.applicantName}
            onChange={(e) => set('applicantName', e.target.value)}
          />
          <label htmlFor="contact">Contact</label>
          <input id="contact" value={form.contact} onChange={(e) => set('contact', e.target.value)} />
          <label htmlFor="isAnonymous">
            <input
              id="isAnonymous"
              type="checkbox"
              checked={form.isAnonymous}
              onChange={(e) => set('isAnonymous', e.target.checked)}
            />
            Keep my identity anonymous
          </label>
        </>
      )}

      {errors.map((err) => (
        <p key={err} role="alert">
          {err}
        </p>
      ))}
      {status === 'error' && <p role="alert">{serverError}</p>}
      <button type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Submitting…' : forWhom === 'other' ? 'Send this referral' : 'Submit case'}
      </button>
    </form>
  )
}
