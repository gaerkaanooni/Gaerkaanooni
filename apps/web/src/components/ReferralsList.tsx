'use client'

import { useCallback, useEffect, useState } from 'react'
import { categoryLabel, isCategory } from '@pil/domain'

export interface ReferralRow {
  id: string
  referredFor: string
  category: string | null
  matter: string
  region: string | null
  contact: string | null
  referrer: string | null
  status: string
  createdAt: string
}

const STATUSES = ['NEW', 'CONTACTED', 'ASSISTED', 'CLOSED'] as const

/**
 * Staff triage list for referrals. Reads `/api/referrals` (staff-only) and lets
 * staff advance a referral from NEW → CONTACTED → ASSISTED → CLOSED.
 */
export default function ReferralsList() {
  const [refs, setRefs] = useState<ReferralRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    const res = await fetch('/api/referrals')
    if (!res.ok) {
      setError('Could not load referrals')
      setLoaded(true)
      return
    }
    const body = await res.json()
    setRefs((body.referrals as ReferralRow[]) ?? [])
    setLoaded(true)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function advance(r: ReferralRow) {
    const current = STATUSES.indexOf(r.status as (typeof STATUSES)[number])
    const next = STATUSES[current + 1]
    if (!next) return
    const res = await fetch(`/api/referrals/${r.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    if (res.ok) await refresh()
  }

  if (!loaded) return <p className="docs-empty">Loading referrals…</p>
  if (refs.length === 0) return <p className="docs-empty">No referrals yet.</p>

  return (
    <ul className="doc-list">
      {error && (
        <p role="alert" className="gate-error">
          {error}
        </p>
      )}
      {refs.map((r) => (
        <li key={r.id} className="doc-item">
          <div className="doc-meta">
            <strong>
              {r.referredFor}
              {r.category && isCategory(r.category) ? ` · ${categoryLabel(r.category)}` : ''}
              {r.region ? ` · ${r.region}` : ''}
            </strong>
            <small>{r.matter.slice(0, 160)}{r.matter.length > 160 ? '…' : ''}</small>
            <small>
              {r.referrer ? `Referred by ${r.referrer}` : 'Anonymous referral'} · {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </small>
          </div>
          <button
            type="button"
            className="link"
            onClick={() => void advance(r)}
            disabled={r.status === 'CLOSED'}
          >
            {r.status === 'CLOSED' ? 'Closed' : `${r.status} → next`}
          </button>
        </li>
      ))}
    </ul>
  )
}
