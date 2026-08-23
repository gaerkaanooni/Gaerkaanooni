'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { track, analyticsOptedOut } from '@/lib/analytics'

/**
 * Fires a `pageview` event on every route change. Rendered once in the root
 * layout. Respects the visitor analytics opt-out flag from `lib/analytics`.
 */
export default function AnalyticsTracker() {
  const pathname = usePathname()
  const fired = useRef<string | null>(null)

  useEffect(() => {
    if (analyticsOptedOut()) return
    if (fired.current === pathname) return
    fired.current = pathname
    void track({ name: 'pageview', props: { path: pathname } })
  }, [pathname])

  return null
}
