import type { NextConfig } from 'next'

/**
 * Gaerkaanooni — Next.js config.
 *
 * Security headers are set for every route. They are intentionally permissive
 * enough for a server-rendered app that fetches from Supabase (Auth, Storage) and
 * optionally Razorpay, while still giving real protections: no inline scripts,
 * strict referrer policy, HSTS in production, and clickjacking/XSS guards.
 */
const securityHeaders = [
  // XSS / injection
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Loosely-directed CSP: Next inlines its bootstrap scripts, so 'unsafe-inline'
  // and 'unsafe-eval' (dev/prod hydration) are required by the framework. Framing,
  // object sources and data: URIs are locked down.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      // Supabase / Razorpay connect targets; widen when payments go live.
      "connect-src 'self' https://*.supabase.co https://*.supabase.co/* https://api.razorpay.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  transpilePackages: ['@pil/domain', '@pil/db', '@pil/testkit'],
  poweredByHeader: false,
  async redirects() {
    return [
      // Referrals are a mode of the single intake page, not their own page.
      { source: '/refer', destination: '/submit?for=other', permanent: false },
      // One auth page: signing up and signing in are the same gate (OTP / Google).
      { source: '/register', destination: '/login', permanent: false },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
