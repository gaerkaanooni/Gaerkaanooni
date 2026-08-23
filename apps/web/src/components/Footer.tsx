import Link from 'next/link'
import Logo from '@/components/Logo'

/**
 * Site footer. Links the core paths and the trust/legal pages so visitors always
 * have a way to understand the platform, get help, and find the formal pages.
 */
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="wordmark">
            <Logo size={22} tone="ink" />
            <span>
              Gaer<em>kaanooni</em>
            </span>
          </span>
          <p>A fair hearing shouldn&rsquo;t depend on what you can afford.</p>
          <p className="footer-note">© {new Date().getFullYear()} Gaerkaanooni · Not legal advice.</p>
        </div>

        <nav className="footer-nav" aria-label="Explore">
          <span className="footer-heading">Explore</span>
          <Link href="/">The docket</Link>
          <Link href="/submit">Submit a case</Link>
          <Link href="/submit?for=other">Refer someone</Link>
          <Link href="/response">Urgent intake</Link>
          <Link href="/about">About</Link>
        </nav>

        <nav className="footer-nav" aria-label="Join">
          <span className="footer-heading">Join</span>
          <Link href="/login">Sign in / create account</Link>
        </nav>

        <nav className="footer-nav" aria-label="Legal">
          <span className="footer-heading">Legal</span>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/terms">Terms</Link>
          <Link href="/about">How we handle money</Link>
          <a href="mailto:help@gaerkaanooni.in">Contact us</a>
        </nav>
      </div>
    </footer>
  )
}
