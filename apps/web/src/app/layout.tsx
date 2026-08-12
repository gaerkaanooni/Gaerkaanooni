import type { Metadata } from 'next'
import { Fraunces, Martian_Mono, Spectral, Tiro_Devanagari_Hindi } from 'next/font/google'
import { auth } from '@/auth'
import { canPerform, type Role } from '@pil/domain'
import Nav from '@/components/Nav'
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
  title: 'Gaerkaanooni',
  description: "Back public interest litigation with real commitment. Change.org's reach, Kickstarter's commitment.",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [staff, pub] = await Promise.all([auth(), readPublicSession()])
  const isStaff = Boolean(staff?.user && canPerform(staff.user.role as Role, 'dashboard.view'))
  const isAdmin = Boolean(staff?.user && canPerform(staff.user.role as Role, 'finance.view'))
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable} ${devanagari.variable}`}>
      <body>
        <Nav
          signedIn={Boolean(staff?.user || pub)}
          isStaff={isStaff}
          isAdmin={isAdmin}
          kind={staff?.user ? 'staff' : pub ? 'public' : null}
        />
        {children}
      </body>
    </html>
  )
}
