import type { Metadata } from 'next'
import { Fraunces, Martian_Mono, Spectral, Tiro_Devanagari_Hindi } from 'next/font/google'
import { getStaffSession } from '@/lib/auth-session'
import { canPerform, type Role } from '@pil/domain'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import AnalyticsTracker from '@/components/AnalyticsTracker'
import { readPublicSession } from '@/lib/public-auth'
import './globals.css'

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '900'],
})

const body = Spectral({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
})

const mono = Martian_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '700'],
})

const devanagari = Tiro_Devanagari_Hindi({
  subsets: ['devanagari'],
  variable: '--font-deva',
  weight: '400',
})

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
  title: {
    default: 'Gaerkaanooni',
    template: '%s — Gaerkaanooni',
  },
  description:
    "A fair hearing shouldn't depend on what you can afford. Legal matters funded by the public — every case screened by a lawyer, every rupee audited, every matter followed to its judgment.",
  applicationName: 'Gaerkaanooni',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.svg',
  },
  openGraph: {
    type: 'website',
    title: 'Gaerkaanooni — Fund the legal matters that need a hearing',
    description:
      "A fair hearing shouldn't depend on what you can afford. Legal matters funded by the public — every case screened by a lawyer, every rupee audited, every matter followed to its judgment.",
    url: process.env.NEXT_PUBLIC_SITE_URL ?? undefined,
    siteName: 'Gaerkaanooni',
    images: ['/opengraph-image.svg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gaerkaanooni — Fund the legal matters that need a hearing',
    description:
      "A fair hearing shouldn't depend on what you can afford. Legal matters funded by the public.",
    images: ['/opengraph-image.svg'],
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [staff, pub] = await Promise.all([getStaffSession(), readPublicSession()])
  const isStaff = Boolean(staff && canPerform(staff.role as Role, 'dashboard.view'))
  const isAdmin = Boolean(staff && canPerform(staff.role as Role, 'finance.view'))
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable} ${devanagari.variable}`}>
      <body>
        <AnalyticsTracker />
        <Nav
          signedIn={Boolean(staff || pub)}
          isStaff={isStaff}
          isAdmin={isAdmin}
          kind={staff ? 'staff' : pub ? 'public' : null}
        />
        {children}
        <Footer />
      </body>
    </html>
  )
}
