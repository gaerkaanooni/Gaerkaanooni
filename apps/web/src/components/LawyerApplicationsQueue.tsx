'use client'

import { useCallback, useEffect, useState } from 'react'
import { categoryLabel, isCategory } from '@pil/domain'

const label = (value: string) => (isCategory(value) ? categoryLabel(value) : value)

export interface ApplicationRow {
  id: string
  email: string
  fullName: string
  barCouncilId: string
  yearsPractice: number
  skills: string[]
  region: string | null
  capacityLimit: number
  motivation: string | null
  status: string
  decisionReason: string | null
  createdAt: string
}

/**
 * Admin queue for lawyer applications. Approve provisions the volunteer
 * (User role LAWYER + Volunteer row); reject records a reason and allows
 * re-application.
 */
export default function LawyerApplicationsQueue() {
  const [apps, setApps] = useState<ApplicationRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({})

  const refresh = useCallback(async () => {
    const res = await fetch('/api/volunteers/applications?status=PENDING')
    if (!res.ok) {
      setError('Could not load applications')
      setLoaded(true)
      return
    }
    const body = await res.json()
    setApps((body.applications as ApplicationRow[]) ?? [])
    setLoaded(true)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function decide(row: ApplicationRow, decision: 'approved' | 'rejected') {
    const reason =
      decision === 'approved' ? `Bar details verified — welcome to the panel` : (rejectReasons[row.id] ?? '').trim()
    if (!reason) {
      setError('A rejection reason is required')
      return
    }
    setError('')
    setBusyId(row.id)
    const res = await fetch(`/api/volunteers/applications/${row.id}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, reason }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Decision failed' }))
      setError(body.error ?? 'Decision failed')
    }
    setBusyId('')
    await refresh()
  }

  if (!loaded) return <p className="docs-empty">Loading applications…</p>
  if (apps.length === 0) return <p className="docs-empty">No pending applications.</p>

  return (
    <ul className="doc-list">
      {error && (
        <p role="alert" className="gate-error">
          {error}
        </p>
      )}
      {apps.map((a) => (
        <li key={a.id} className="doc-item">
          <div className="doc-meta">
            <strong>{a.fullName}</strong> · {a.email}
            <span>
              Bar ID {a.barCouncilId} · {a.yearsPractice} yr(s) ·{' '}
              {a.skills.map((s) => label(s)).join(', ')}
            </span>
            <span>
              {a.region ?? 'Any region'} · up to {a.capacityLimit} concurrent case(s)
            </span>
            {a.motivation && <span className="description">{a.motivation}</span>}
          </div>
          <div className="vol-actions">
            <input
              aria-label={`Rejection reason for ${a.fullName}`}
              placeholder="Rejection reason"
              value={rejectReasons[a.id] ?? ''}
              onChange={(e) => setRejectReasons((prev) => ({ ...prev, [a.id]: e.target.value }))}
            />
            <button
              type="button"
              className="button"
              disabled={busyId === a.id}
              onClick={() => decide(a, 'approved')}
            >
              Approve
            </button>
            <button
              type="button"
              className="ghost"
              disabled={busyId === a.id}
              onClick={() => decide(a, 'rejected')}
            >
              Reject
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
