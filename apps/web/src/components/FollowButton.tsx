'use client'

import { useState } from 'react'

export default function FollowButton({ campaignId }: { campaignId: string }) {
  const [followed, setFollowed] = useState(false)
  const [error, setError] = useState('')

  async function follow() {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/follow`, { method: 'POST' })
      if (!res.ok) throw new Error('Follow failed')
      setFollowed(true)
    } catch {
      setError('Could not follow this case.')
    }
  }

  return (
    <div>
      {followed ? <p>Following</p> : <button onClick={follow}>Follow</button>}
      {error && <p role="alert">{error}</p>}
    </div>
  )
}
