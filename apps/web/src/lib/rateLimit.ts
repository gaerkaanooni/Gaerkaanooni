import { NextResponse } from 'next/server'

/**
 * Lightweight in-memory rate limiter for public endpoints.
 *
 * Pre-launch this is a simple fixed-window limiter keyed by IP (and an extra
 * discriminator). It uses no external store, so it works offline and on Vercel's
 * serverless instances (per-instance memory — imperfect at scale, but a real
 * guard against trivial flood/abuse now; swap for Upstash/Redis when live).
 *
 * Responses include Retry-After, and the limit is deliberately conservative for
 * auth/referral channels.
 */

interface Window {
  count: number
  resetAt: number
}

const BUCKETS = new Map<string, Window>()

function now(): number {
  return Date.now()
}

/**
 * Check whether a key is within its limit for the window.
 * Returns `true` when allowed.
 */
export function rateLimit({ key, limit, windowMs }: { key: string; limit: number; windowMs: number }): boolean {
  const t = now()
  const cur = BUCKETS.get(key)
  if (!cur || cur.resetAt <= t) {
    BUCKETS.set(key, { count: 1, resetAt: t + windowMs })
    return true
  }
  if (cur.count >= limit) {
    return false
  }
  cur.count += 1
  return true
}

/** Safe attempt to read a client IP from headers (Vercel/CF pass it in). */
export function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for') ?? ''
  const first = fwd.split(',')[0]?.trim()
  return first || request.headers.get('x-real-ip') || 'unknown'
}

/** Guard a route: returns a 429 JSON response when the limit is exceeded. */
export function guardRateLimit(args: {
  request: Request
  discriminator: string
  limit: number
  windowMs?: number
}): NextResponse | null {
  const key = `rl:${clientIp(args.request)}:${args.discriminator}`
  if (!rateLimit({ key, limit: args.limit, windowMs: args.windowMs ?? 60_000 })) {
    return NextResponse.json({ error: 'Too many requests. Please wait and try again.' }, { status: 429 })
  }
  return null
}

// Garbage-collect expired buckets opportunistically.
setInterval(() => {
  const t = now()
  for (const [k, v] of BUCKETS) {
    if (v.resetAt <= t) BUCKETS.delete(k)
  }
}, 60_000).unref?.()
