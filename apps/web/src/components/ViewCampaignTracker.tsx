'use client'

import { useEffect, useRef } from 'react'
import { track } from '@/lib/analytics'

/** Fires a `view_campaign` event once when the page mounts (campaign detail). */
export default function ViewCampaignTracker({ campaignId }: { campaignId: string }) {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    void track({ name: 'view_campaign', props: { campaignId } })
  }, [campaignId])
  return null
}
