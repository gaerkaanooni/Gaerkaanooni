import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms — Gaerkaanooni',
}

export default function TermsPage() {
  return (
    <main>
      <section className="hero reveal">
        <p className="kicker">Terms</p>
        <h1>The deal, in plain language</h1>
        <p className="lede">
          Short version: pledges are only charged if a matter reaches its goal; missed goals are refunded in full;
          and we are a funding platform, not your law firm.
        </p>
      </section>

      <div className="prose reveal">
        <h3>Pledges &amp; refunds</h3>
        <ul>
          <li>A pledge is a commitment, not an immediate charge. It is captured only if the matter meets its goal by the deadline.</li>
          <li>If the goal is missed, every backer is refunded in full, automatically. We keep nothing.</li>
          <li>A flat 5% of captured funds covers platform and payment processing. It is never charged on top.</li>
        </ul>

        <h3>Screening is not a guarantee</h3>
        <p>
          Volunteer lawyers screen every matter for merit and jurisdiction before it is funded. Screening means we
          believe it is worth a hearing — it does not promise an outcome, and litigation can be lost, withdrawn, or
          delayed.
        </p>

        <h3>We are not your lawyer</h3>
        <p>
          Gaerkaanooni funds litigation and publishes progress. It does not provide legal advice, and using the
          platform does not create a lawyer–client relationship. If a funded matter is assigned counsel, that
          relationship is between you and them.
        </p>

        <h3>Urgent matters</h3>
        <p>
          The response fund exists for time-critical harms. We assess urgency and available funds and may decline a
          request we cannot responsibly act on — a decline is not a judgment about the person or the matter.
        </p>

        <h3>Conduct</h3>
        <p>
          Do not submit matters you know to be false, and do not refer someone who has not agreed to be contacted.
          We may remove content or accounts that abuse the platform or the people on it.
        </p>
      </div>
    </main>
  )
}
