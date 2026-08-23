'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CATEGORY_LABELS, VALID_CATEGORIES, MAX_CAPACITY_LIMIT } from '@pil/domain'

/**
 * Public lawyer application form (posts /api/volunteer/apply). The applicant
 * must already be signed in — the server takes the email from the session.
 */
export default function LawyerApplicationForm({ defaultName = '' }: { defaultName?: string }) {
  const router = useRouter()
  const [fullName, setFullName] = useState(defaultName)
  const [barCouncilId, setBarCouncilId] = useState('')
  const [yearsPractice, setYearsPractice] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [region, setRegion] = useState('')
  const [capacityLimit, setCapacityLimit] = useState('2')
  const [motivation, setMotivation] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  function toggleSkill(value: string) {
    setSkills((prev) => (prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (skills.length === 0) {
      setError('Pick at least one area of practice')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/volunteer/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          barCouncilId,
          yearsPractice: Number(yearsPractice),
          skills,
          region: region || null,
          capacityLimit: Number(capacityLimit),
          motivation: motivation || null,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Could not submit the application')
      setDone(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the application')
      setBusy(false)
    }
  }

  if (done) {
    return (
      <p role="status" className="receipt">
        Application received — the coordinators will review it shortly. This page becomes your
        engagement board once you are approved.
      </p>
    )
  }

  return (
    <form onSubmit={submit} className="gate-form">
      <label htmlFor="vol-name">Full name</label>
      <input
        id="vol-name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        autoComplete="name"
      />

      <label htmlFor="vol-bar">Bar council enrolment number</label>
      <input
        id="vol-bar"
        value={barCouncilId}
        onChange={(e) => setBarCouncilId(e.target.value)}
        placeholder="e.g. MAH/12345/2016"
      />

      <label htmlFor="vol-years">Years of practice</label>
      <input
        id="vol-years"
        type="number"
        min={0}
        max={70}
        step={1}
        value={yearsPractice}
        onChange={(e) => setYearsPractice(e.target.value)}
      />

      <fieldset className="gate-fieldset">
        <legend>Areas of practice</legend>
        {VALID_CATEGORIES.map((value) => (
          <label key={value} className="check">
            <input
              type="checkbox"
              checked={skills.includes(value)}
              onChange={() => toggleSkill(value)}
            />{' '}
            {CATEGORY_LABELS[value]}
          </label>
        ))}
      </fieldset>

      <label htmlFor="vol-region">Region (optional)</label>
      <input
        id="vol-region"
        value={region}
        onChange={(e) => setRegion(e.target.value)}
        placeholder="e.g. Delhi"
      />

      <label htmlFor="vol-capacity">Concurrent cases you can carry</label>
      <select id="vol-capacity" value={capacityLimit} onChange={(e) => setCapacityLimit(e.target.value)}>
        {Array.from({ length: Math.min(10, MAX_CAPACITY_LIMIT) }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>

      <label htmlFor="vol-motivation">Why volunteer? (optional)</label>
      <textarea
        id="vol-motivation"
        rows={3}
        value={motivation}
        onChange={(e) => setMotivation(e.target.value)}
      />

      {error && (
        <p role="alert" className="gate-error">
          {error}
        </p>
      )}
      <button type="submit" className="button" disabled={busy}>
        {busy ? 'Sending…' : 'Submit application'}
      </button>
    </form>
  )
}
