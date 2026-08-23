'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { signOut } from 'next-auth/react'
import Logo from '@/components/Logo'

export default function Nav({
  signedIn,
  isStaff,
  isAdmin,
  kind,
}: {
  signedIn: boolean
  isStaff?: boolean
  isAdmin?: boolean
  kind?: 'staff' | 'public' | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleSignOut() {
    if (kind === 'staff') {
      await signOut({ callbackUrl: '/' })
      return
    }
    await fetch('/api/public-auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <nav>
      <span className="brand">
        <Link href="/" className="wordmark">
          <Logo size={26} tone="seal" />
          <span>
            Gaer<em>kaanooni</em>
          </span>
        </Link>
        <span className="devanagari" aria-hidden="true">
          ग़ैरक़ानूनी
        </span>
      </span>
      <button
        type="button"
        className={`nav-toggle${open ? ' open' : ''}`}
        aria-expanded={open}
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="bar" />
        <span className="bar" />
        <span className="bar" />
      </button>
      <span
        className={`links${open ? ' open' : ''}`}
        onClick={(e) => {
          const t = e.target as HTMLElement
          if (t.closest('a') || t.closest('button')) setOpen(false)
        }}
      >
        <Link href="/submit">Submit a case</Link>
        <Link href="/refer">Refer someone</Link>
        <Link href="/response">Urgent intake</Link>
        <Link href="/about">About</Link>
        {signedIn ? (
          <>
            {isStaff && <Link href="/dashboard">Dashboard</Link>}
            {isAdmin && <Link href="/analytics">Analytics</Link>}
            <button className="signout" onClick={handleSignOut}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link href="/register">Join</Link>
            <Link href="/login">Sign in</Link>
          </>
        )}
      </span>
    </nav>
  )
}
