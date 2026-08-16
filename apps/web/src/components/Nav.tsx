'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
        <Link href="/login">Sign in</Link>
      )}
    </nav>
  )
}
