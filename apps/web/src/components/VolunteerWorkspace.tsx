'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { categoryLabel, isCategory } from '@pil/domain'
import type { EngagementBoard, VolunteerProfile } from '@pil/db'

const label = (value: string) => (isCategory(value) ? categoryLabel(value) : value)

/**
 * The approved lawyer's engagement board:
 *   - commitment card (availability / capacity / hours)
 *   - their confirmed cases (release) and pending offers (withdraw)
 *   - open matters they can offer to help on — each offer goes to the
 *     coordinators for confirmation before an assignment is created.
 */
export default function VolunteerWorkspace({
  profile,
  board,
}: {
  profile: VolunteerProfile
  board: EngagementBoard
}) {
  const router = useRouter()
  const [availability, setAvailability] = useState(profile.availability)
  const [capacity, setCapacity] = useState(String(profile.capacityLimit))
  const [error, setError] = useState('')
  const [busyKey, setBusyKey] = useState('')

  async function post(url: string, body: Record<string, unknown>, key: string) {
    setBusyKey(key)
    setError('')
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Something went wrong' }))
        throw new Error(data.error ?? 'Something went wrong')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusyKey('')
    }
  }

  const savePrefs = () =>
    post('/api/volunteer/preferences', { availability, capacityLimit: Number(capacity) }, 'prefs')

  const openCases = board.openCases.filter((c) => !c.mine)

  return (
    <>
      <p className="detail-category reveal">Pro bono · volunteer panel</p>
      <h1>Welcome, {profile.name?.split(' ')[0] ?? 'counsel'}</h1>

      <section aria-label="Your commitment" className="vol-card">
        <div className="vol-strip">
          <span>
            <strong>{profile.activeCaseCount}</strong> / {profile.capacityLimit} active cases
          </span>
          <span>
            <strong>{profile.hoursContributed}</strong> pro-bono hours logged
          </span>
          <span>{board.myPendingRequests.length} offer(s) awaiting confirmation</span>
        </div>
        <div className="vol-controls">
          <label htmlFor="vol-avail">Availability</label>
          <select id="vol-avail" value={availability} onChange={(e) => setAvailability(e.target.value)}>
            <option value="available">Available</option>
            <option value="busy">Busy</option>
            <option value="away">Away</option>
          </select>
          <label htmlFor="vol-cap">Case limit</label>
          <input
            id="vol-cap"
            type="number"
            min={1}
            max={20}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
          <button type="button" className="button" onClick={savePrefs} disabled={busyKey === 'prefs'}>
            Save
          </button>
        </div>
        {!profile.assignable && (
          <p className="gate-muted">
            Offers are paused while you are busy/away or at your case limit.
          </p>
        )}
      </section>

      {error && (
        <p role="alert" className="gate-error">
          {error}
        </p>
      )}

      <section aria-label="My cases">
        <h2>Your matters</h2>
        {board.myAssignments.length === 0 && board.myPendingRequests.length === 0 ? (
          <p className="docs-empty">Nothing yet — offer to help on a matter below.</p>
        ) : (
          <ul className="doc-list">
            {board.myAssignments.map((a) => (
              <li key={a.assignmentId} className="doc-item">
                <div className="doc-meta">
                  <strong>{a.caseTitle}</strong>
                  <span>
                    {a.kind.toLowerCase()} · {a.caseStage.toLowerCase()} ·{' '}
                    {a.caseRegion ?? 'any region'}
                  </span>
                </div>
                <button
                  type="button"
                  className="ghost"
                  disabled={busyKey === `release-${a.assignmentId}`}
                  onClick={() =>
                    post('/api/volunteer/assignments/release', { assignmentId: a.assignmentId }, `release-${a.assignmentId}`)
                  }
                >
                  Release
                </button>
              </li>
            ))}
            {board.myPendingRequests.map((r) => (
              <li key={r.requestId} className="doc-item">
                <div className="doc-meta">
                  <strong>{r.caseTitle}</strong>
                  <span className="vol-badge vol-pending">offer awaiting confirmation</span>
                </div>
                <button
                  type="button"
                  className="ghost"
                  disabled={busyKey === `withdraw-${r.requestId}`}
                  onClick={() =>
                    post(`/api/volunteer/requests/${r.requestId}/withdraw`, {}, `withdraw-${r.requestId}`)
                  }
                >
                  Withdraw
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Open matters">
        <h2>Matters open for help</h2>
        {openCases.length === 0 ? (
          <p className="docs-empty">No published matters are open right now.</p>
        ) : (
          <ul className="doc-list">
            {openCases.map((c) => (
              <li key={c.id} className="doc-item">
                <div className="doc-meta">
                  <strong>{c.title}</strong>
                  <span>
                    {label(c.category)} · {c.stage.toLowerCase()} ·{' '}
                    {c.region ?? 'any region'} · {c.activeVolunteers} volunteer(s)
                  </span>
                  <span className="description">{c.summary}</span>
                </div>
                {c.myRequestStatus === 'PENDING' ? (
                  <span className="vol-badge vol-pending">awaiting confirmation</span>
                ) : c.myRequestStatus === 'DECLINED' ? (
                  <button
                    type="button"
                    className="ghost"
                    disabled={!profile.assignable || busyKey === `req-${c.id}`}
                    onClick={() => post('/api/volunteer/requests', { caseId: c.id }, `req-${c.id}`)}
                  >
                    Offer again
                  </button>
                ) : (
                  <button
                    type="button"
                    className="button"
                    disabled={!profile.assignable || busyKey === `req-${c.id}`}
                    onClick={() => post('/api/volunteer/requests', { caseId: c.id }, `req-${c.id}`)}
                  >
                    Offer to help
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Log hours">
        <h2>Log pro-bono hours</h2>
        <LogHours onLogged={() => router.refresh()} />
      </section>
    </>
  )
}

function LogHours({ onLogged }: { onLogged: () => void }) {
  const [hours, setHours] = useState('')
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setMsg('')
    setBusy(true)
    try {
      const res = await fetch('/api/volunteer/hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours: Number(hours), note: note || null }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Could not log hours')
      setMsg(`Logged — total now ${body.total} hour(s).`)
      setHours('')
      setNote('')
      onLogged()
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Could not log hours')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="vol-hours">
      <label htmlFor="hours-input">Hours</label>
      {/* No min/step constraints — the API owns the rule ("whole number,
          at least 1") and returns a human message we can show inline. */}
      <input
        id="hours-input"
        type="number"
        value={hours}
        onChange={(e) => setHours(e.target.value)}
      />
      <label htmlFor="hours-note">What did you work on? (optional)</label>
      <input id="hours-note" value={note} onChange={(e) => setNote(e.target.value)} />
      <button type="submit" className="button" disabled={busy}>
        Log hours
      </button>
      {msg && (
        <p role="status" className="receipt-note">
          {msg}
        </p>
      )}
      {err && (
        <p role="alert" className="gate-error">
          {err}
        </p>
      )}
    </form>
  )
}
