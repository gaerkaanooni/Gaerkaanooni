'use client'

import { useState } from 'react'

export default function ResponseIntakeForm() {
  const [form, setForm] = useState({
    whatHappened: '',
    where: '',
    when: '',
    applicantName: '',
    contact: '',
    isAnonymous: false,
  })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (form.whatHappened.trim().length === 0) {
      setError('What happened is required')
      setStatus('error')
      return
    }
    setStatus('submitting')
    try {
      const res = await fetch('/api/response-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatHappened: form.whatHappened.trim(),
          where: form.where.trim() || null,
          when: form.when.trim() || null,
          applicantName: form.applicantName.trim() || null,
          contact: form.contact.trim() || null,
          isAnonymous: form.isAnonymous,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Submission failed')
      setStatus('success')
    } catch {
      setStatus('error')
      setError('Submission failed. Please try again.')
    }
  }

  if (status === 'success') {
    return <p>Your urgent response request was received.</p>
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor="whatHappened">What happened</label>
      <textarea id="whatHappened" value={form.whatHappened} onChange={(e) => set('whatHappened', e.target.value)} />
      <label htmlFor="where">Where</label>
      <input id="where" value={form.where} onChange={(e) => set('where', e.target.value)} />
      <label htmlFor="when">When</label>
      <input id="when" value={form.when} onChange={(e) => set('when', e.target.value)} />
      <label htmlFor="applicantName">Applicant name</label>
      <input id="applicantName" value={form.applicantName} onChange={(e) => set('applicantName', e.target.value)} />
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
      {status === 'error' && <p role="alert">{error}</p>}
      <button type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Submitting…' : 'Submit'}
      </button>
    </form>
  )
}
