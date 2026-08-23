'use client'

/**
 * Root (global) error boundary. Rendered instead of the whole layout when the
 * app-shell itself fails. It must provide its own <html>/<body> because the root
 * layout boundary has already thrown. Minimal inline styling so it works even if
 * the CSS/fonts failed to load.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#f3ecdc', color: '#211b10', fontFamily: 'Georgia, serif' }}>
        <main style={{ maxWidth: 560, margin: '0 auto', padding: '4rem 1.25rem', textAlign: 'center' }}>
          <p style={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 13, color: '#8f1613' }}>
            Gaerkaanooni
          </p>
          <h1 style={{ fontSize: 28 }}>The app hit a snag</h1>
          <p style={{ lineHeight: 1.7, color: '#3a3120' }}>
            Something went wrong on our end. Your details are safe, and nothing has been charged. Try again or refresh
            the page.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 16,
              padding: '12px 22px',
              background: '#b3201c',
              color: '#f3ecdc',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
