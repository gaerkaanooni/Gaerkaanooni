'use client'

import { useState } from 'react'
import { track } from '@/lib/analytics'

/**
 * Follow a campaign for update notifications. Uses a persistent button with
 * `aria-pressed` plus an `aria-live` region so screen readers hear the state
 * change ("Following" / "Follow").
 */
export default function FollowButton({ campaignId }: { campaignId: string }) {
  const [followed, setFollowed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function follow() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/follow`, { method: 'POST' })
      if (!res.ok) throw new Error('Follow failed')
      setFollowed(true)
      void track({ name: 'follow', props: { campaignId } })
    } catch {
      setError('Could not follow this case.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        aria-pressed={followed}
        onClick={() => void follow()}
        disabled={busy || followed}
      >
        {followed ? 'Following' : busy ? 'Following…' : 'Follow'}
      </button>
      <span aria-live="polite" className="sr-only">
        {followed ? 'Following this case' : ''}
      </span>
      {error && <p role="alert">{error}</p>}
    </div>
  )
}
