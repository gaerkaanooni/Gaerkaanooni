/**
 * Global loading fallback shown while a route streams its dynamic data.
 * Keep it tiny so it never delays interactive paint; the page content replaces it.
 */
export default function Loading() {
  return (
    <main className="narrow" aria-busy="true" style={{ padding: '3rem 1rem' }}>
      <p className="kicker" aria-hidden="true">
        Loading…
      </p>
      <div className="rule" aria-hidden="true" />
      <p className="muted">Gathering the docket…</p>
    </main>
  )
}
