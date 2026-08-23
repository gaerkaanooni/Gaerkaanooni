'use client'

/**
 * Route-segment error boundary. Shown when a page/route throws at render time so
 * visitors get a calm, branded message instead of a raw error. "Try again" clears
 * the boundary and re-renders without a full reload.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="narrow" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <p className="kicker">Something went wrong</p>
      <h1>This page hit a snag</h1>
      <p className="lede">
        We could not finish showing this page. Your details are safe, and nothing has been charged. Please try again or
        head back to the docket.
      </p>
      <div className="cta-row" style={{ justifyContent: 'center' }}>
        <button type="button" className="button" onClick={() => reset()}>
          Try again
        </button>
        <a href="/" className="button ghost">
          Back to the docket
        </a>
      </div>
      <p className="detail-category" style={{ marginTop: '1.5rem' }}>
        Reference {error.digest ? `#${error.digest}` : ''}
      </p>
    </main>
  )
}
