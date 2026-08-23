import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy — Gaerkaanooni',
}

export default function PrivacyPage() {
  return (
    <main>
      <section className="hero reveal">
        <p className="kicker">Privacy</p>
        <h1>What we collect, and what we never do</h1>
        <p className="lede">
          People trust us with sensitive matters — sometimes on behalf of someone else. This page says plainly what
          we hold and why. No dark patterns, no buried clauses.
        </p>
      </section>

      <div className="prose reveal">
        <h3>What we collect</h3>
        <ul>
          <li>
            <strong>Account:</strong> your email address (via one-time code or Google) and, if you give it, a name.
          </li>
          <li>
            <strong>Submissions:</strong> the matter details you write — including anything you choose to share
            about yourself or, if you are referring someone else, about them.
          </li>
          <li>
            <strong>Pledges:</strong> contribution amounts and their status. Payment instruments are handled by our
            payment processor; we do not see or store card or UPI credentials.
          </li>
          <li>
            <strong>Case documents:</strong> stored in a private bucket, reachable only by signed-in staff through
            expiring signed links.
          </li>
          <li>
            <strong>Product analytics:</strong> anonymous page-view and funnel events tied to a random id stored in
            your browser. No names, emails, or matter contents.
          </li>
        </ul>

        <h3>Referring someone else</h3>
        <p>
          Their contact details are stored <strong>only if you tick the box saying they have agreed to be
          contacted</strong>. Without that consent, we keep the matter description but no way to reach them — and we
          will never publish a person&rsquo;s identity without their okay.
        </p>

        <h3>What we never do</h3>
        <ul>
          <li>We never sell your data.</li>
          <li>We never contact a referred person who has not consented.</li>
          <li>We do not use your submissions for advertising or profiling.</li>
        </ul>

        <h3>Cookies &amp; analytics opt-out</h3>
        <p>
          We use essential cookies to keep you signed in. Analytics can be switched off at any time — say the word
          at <a href="mailto:help@gaerkaanooni.in">help@gaerkaanooni.in</a> and we disable it for you.
        </p>

        <h3>Deletion</h3>
        <p>
          Ask us to delete your account and personal data and we will, except where law or an active court filing
          requires us to retain a record of funds moved.
        </p>
      </div>
    </main>
  )
}
