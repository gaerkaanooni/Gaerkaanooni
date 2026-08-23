'use client'

import { useCallback, useEffect, useState } from 'react'

export interface RequestRow {
  id: string
  note: string | null
  createdAt: string
  caseTitle: string
  caseStage: string
  caseRegion: string | null
  volunteerName: string
  volunteerEmail: string
  volunteerSkills: string[]
  volunteerRegion: string | null
  activeCaseCount: number
  capacityLimit: number
}

/**
 * Coordinator queue for offers of help. Confirming is the hard gate: the
 * server re-checks the volunteer's availability/capacity before creating the
 * assignment, so a stale queue entry can never over-commit anyone.
 */
export default function VolunteerRequestsQueue() {
  const [rows, setRows] = useState<RequestRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [declineReasons, setDeclineReasons] = useState<Record<string, string>>({})

  const refresh = useCallback(async () => {
    const res = await fetch('/api/volunteers/requests?status=PENDING')
    if (!res.ok) {
      setError('Could not load requests')
      setLoaded(true)
      return
    }
    const body = await res.json()
    setRows((body.requests as RequestRow[]) ?? [])
    setLoaded(true)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function decide(row: RequestRow, decision: 'approved' | 'declined') {
    const reason =
      decision === 'approved' ? 'Capacity confirmed' : (declineReasons[row.id] ?? '').trim()
    if (!reason) {
      setError('A decline reason is required')
      return
    }
    setError('')
    setBusyId(row.id)
    const res = await fetch(`/api/volunteers/requests/${row.id}/decision`, {
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

  if (!loaded) return <p className="docs-empty">Loading requests…</p>
  if (rows.length === 0) return <p className="docs-empty">No pending offers of help.</p>

  return (
    <ul className="doc-list">
      {error && (
        <p role="alert" className="gate-error">
          {error}
        </p>
      )}
      {rows.map((r) => (
        <li key={r.id} className="doc-item">
          <div className="doc-meta">
            <strong>{r.volunteerName}</strong> → {r.caseTitle}
            <span>
              {r.volunteerEmail} · load {r.activeCaseCount}/{r.capacityLimit} ·{' '}
              {r.caseRegion ?? r.volunteerRegion ?? 'any region'}
            </span>
            {r.note && <span className="description">{r.note}</span>}
          </div>
          <div className="vol-actions">
            <input
              aria-label={`Decline reason for ${r.volunteerName} on ${r.caseTitle}`}
              placeholder="Decline reason"
              value={declineReasons[r.id] ?? ''}
              onChange={(e) => setDeclineReasons((prev) => ({ ...prev, [r.id]: e.target.value }))}
            />
            <button
              type="button"
              className="button"
              disabled={busyId === r.id}
              onClick={() => decide(r, 'approved')}
            >
              Confirm
            </button>
            <button
              type="button"
              className="ghost"
              disabled={busyId === r.id}
              onClick={() => decide(r, 'declined')}
            >
              Decline
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
