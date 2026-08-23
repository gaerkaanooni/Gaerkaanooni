export const metadata = { title: 'Not found — Gaerkaanooni' }

export default function NotFound() {
  return (
    <main className="narrow" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <p className="kicker">Page not found</p>
      <h1>This page does not exist</h1>
      <p className="lede">
        The page you are looking for may have moved or never existed. You can head back to the docket and explore the
        matters that are funding now.
      </p>
      <div className="cta-row" style={{ justifyContent: 'center' }}>
        <a href="/" className="button">
          Back to the docket
        </a>
        <a href="/submit" className="button ghost">
          Submit a case
        </a>
      </div>
    </main>
  )
}
