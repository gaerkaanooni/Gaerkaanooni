/**
 * Analytics seam.
 *
 * Env-gated: with no `NEXT_PUBLIC_ANALYTICS_DSN` configured everything is a no-op,
 * so local dev and the offline test suite emit nothing. When a real analytics
 * endpoint is set (e.g. a PostHog / GA4-compatible ingestion URL), events are sent
 * as a simple POST batch.
 *
 * Events are a fixed, documented catalog — not freeform strings — so funnel
 * analysis stays comparable. See docs/spec/12-analytics.md for the event list.
 */

export type AnalyticsEvent =
  | { name: 'pageview'; props?: Record<string, string> }
  | { name: 'view_campaign'; props: { campaignId: string } }
  | { name: 'click_submit'; props?: Record<string, string> }
  | { name: 'submit_case'; props: { category?: string; track?: string } }
  | { name: 'click_back'; props: { campaignId: string } }
  | { name: 'back_intent'; props: { campaignId: string; amountPaise?: number } }
  | { name: 'follow'; props: { campaignId: string } }
  | { name: 'refer_intent'; props?: Record<string, string> }
  | { name: 'referral_submitted'; props?: Record<string, string> }
  | { name: 'signup_intent'; props?: Record<string, string> }
  | { name: 'signup_complete'; props: { provider?: string } }
  | { name: 'login_intent'; props?: Record<string, string> }
  | { name: 'login_complete'; props: { provider?: string } }

const DSN = process.env.NEXT_PUBLIC_ANALYTICS_DSN

function enabled(): boolean {
  return typeof window !== 'undefined' && Boolean(DSN)
}

/**
 * Fire an analytics event. Client-only. No-op when analytics is not configured.
 * Errors are swallowed — analytics must never break the app.
 */
export async function track(event: AnalyticsEvent): Promise<void> {
  if (!enabled() || !window) return
  const payload = {
    event: event.name,
    properties: event.props ?? {},
    url: window.location.href,
    ts: new Date().toISOString(),
    uid: consentId(),
  }
  try {
    await fetch(DSN as string, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // Send along in the background even if the page navigates away.
      keepalive: true,
    })
  } catch {
    // ignore — non-blocking telemetry
  }
}

/** Stable per-browser anonymous id stored in localStorage (respects DNT-ish opt-out). */
function consentId(): string | null {
  try {
    const key = 'pil_analytics_uid'
    let id = window.localStorage.getItem(key)
    if (!id) {
      id = crypto.randomUUID()
      window.localStorage.setItem(key, id)
    }
    return id
  } catch {
    return null
  }
}

/** Returns true if the visitor has opted out of analytics (stored flag). */
export function analyticsOptedOut(): boolean {
  try {
    return window.localStorage.getItem('pil_analytics_optout') === '1'
  } catch {
    return false
  }
}

export function setAnalyticsOptOut(value: boolean): void {
  try {
    window.localStorage.setItem('pil_analytics_optout', value ? '1' : '0')
  } catch {
    // ignore
  }
}
