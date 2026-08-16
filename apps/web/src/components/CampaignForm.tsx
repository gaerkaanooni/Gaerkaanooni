'use client'

import { useState } from 'react'
import { VALID_CATEGORIES, categoryLabel, type CategoryName } from '@pil/domain'

const CATEGORIES = VALID_CATEGORIES

export default function CampaignForm() {
  const [form, setForm] = useState({
    title: '',
    summary: '',
    description: '',
    category: 'OTHER',
    region: '',
    goal: '',
    deadline: '',
    whatHappened: '',
    applicantName: '',
    contact: '',
    isAnonymous: false,
  })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errors, setErrors] = useState<string[]>([])
  const [serverError, setServerError] = useState('')
  const [createdId, setCreatedId] = useState('')

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const localErrors: string[] = []
    if (form.title.trim().length === 0) localErrors.push('Title is required')
    if (form.summary.trim().length === 0) localErrors.push('Summary is required')
    if (form.whatHappened.trim().length === 0) localErrors.push('A narrative of what happened is required')
    const goalRupees = Number(form.goal)
    if (!Number.isFinite(goalRupees) || goalRupees <= 0) localErrors.push('Goal must be a positive amount in rupees')
    setErrors(localErrors)
    if (localErrors.length > 0) return

    setStatus('submitting')
    try {
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
          goalAmountPaise: Math.round(goalRupees * 100),
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
      setCreatedId(body.id)
      setStatus('success')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Submission failed. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <p>
        Your submission was received. <a href={`/campaigns/${createdId}`}>View case</a>
      </p>
    )
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor="title">Title</label>
      <input id="title" value={form.title} onChange={(e) => set('title', e.target.value)} />
      <label htmlFor="summary">Summary</label>
      <textarea id="summary" value={form.summary} onChange={(e) => set('summary', e.target.value)} />
      <label htmlFor="description">Full description</label>
      <textarea
        id="description"
        value={form.description}
        onChange={(e) => set('description', e.target.value)}
        placeholder="Help supporters understand the problem, who it affects, and what the court order would change. This is the long-form story that appears on the campaign page."
      />
      <label htmlFor="category">Category</label>
      <select id="category" value={form.category} onChange={(e) => set('category', e.target.value)}>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {categoryLabel(c as CategoryName)}
          </option>
        ))}
      </select>
      <label htmlFor="region">Region</label>
      <input id="region" value={form.region} onChange={(e) => set('region', e.target.value)} />
      <label htmlFor="goal">Goal (₹)</label>
      <input id="goal" type="number" min="1" value={form.goal} onChange={(e) => set('goal', e.target.value)} />
      <label htmlFor="deadline">Deadline</label>
      <input id="deadline" type="date" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} />
      <label htmlFor="whatHappened">What happened</label>
      <textarea id="whatHappened" value={form.whatHappened} onChange={(e) => set('whatHappened', e.target.value)} />
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
      {errors.map((err) => (
        <p key={err} role="alert">
          {err}
        </p>
      ))}
      {status === 'error' && <p role="alert">{serverError}</p>}
      <button type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Submitting…' : 'Submit'}
      </button>
    </form>
  )
}
