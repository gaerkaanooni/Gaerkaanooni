export const metadata = {
  title: 'About — Gaerkaanooni',
}

const PRINCIPLES = [
  {
    no: '01',
    title: 'Eligibility before money',
    body: 'Nothing is funded without a lawyer on record confirming it is a genuine legal matter worth a hearing — whether it affects one person or many. Screening is real and documented; every decision is logged.',
  },
  {
    no: '02',
    title: 'Money held visibly',
    body: 'Every case carries a public ledger. Supporters can trace every paisa from the payment gateway to the court fee counter.',
  },
  {
    no: '03',
    title: 'Refunds, automatically',
    body: 'Missed a goal? Every backer is refunded in full, automatically. We do not keep a single rupee of an unfunded campaign.',
  },
  {
    no: '04',
    title: 'Updates after every hearing',
    body: 'Once a case is filed, supporters receive an update at every hearing. When a court order is passed, it is published in full.',
  },
  {
    no: '05',
    title: 'Sign-off for big moves',
    body: 'Money movements above a threshold require a second pair of eyes. Large disbursements and refunds are flagged for independent review.',
  },
  {
    no: '06',
    title: 'The case outlives the campaign',
    body: 'The litigation does not end when funding does. We follow every matter to its close, and we publish the outcome.',
  },
]

export default function AboutPage() {
  return (
    <main>
      <section className="hero reveal">
        <p className="kicker">Who we are · what we do</p>
        <h1>About Gaerkaanooni</h1>
        <p className="lede">
          A fair hearing should not depend on what you can afford. We exist to make sure the legal matters people are
          up against — their own, or those brought forward for a friend, a neighbour, a community — are never stopped
          by the cost of a good lawyer.
        </p>
        <div className="rule" />
        <div className="stat-strip">
          <div className="stat">
            <span className="n">Art. 32</span>
            <span className="l">right to move the Supreme Court</span>
          </div>
          <div className="stat">
            <span className="n">Art. 226</span>
            <span className="l">writ jurisdiction of the High Courts</span>
          </div>
          <div className="stat">
            <span className="n">5%</span>
            <span className="l">flat platform fee, never more</span>
          </div>
          <div className="stat">
            <span className="n">100%</span>
            <span className="l">refunded if a goal is unmet</span>
          </div>
        </div>
      </section>

      <div className="section-head reveal d1">
        <span className="no">§ I</span>
        <h2>What kind of matters do we fund?</h2>
        <span className="line" />
      </div>

      <div className="prose reveal">
        <p>
          Some matters affect many people at once — the pollution of a river, a demolition without notice, a right
          choked for a whole community. Under Article 32 of the Constitution, any person can move the Supreme Court
          directly, and under Article 226, the High Courts can issue writs. This is often called public-interest
          litigation, and it is one of the most powerful instruments an Indian citizen holds.
        </p>
        <p>
          But it is not the only kind of matter that needs help. A fair hearing matters just as much for one person —
          a tenancy threatened, a dismissal without wages, a child denied a place in school, a loved one held without
          cause, a disability that a workplace refuses to accommodate. The law should not be a door that only opens for
          those who can afford to reach it.
        </p>
        <p>
          Whether the matter affects one person or a village, the blocker is often the same: the cost of good lawyering.
          Drafting a sound petition, engaging counsel, marshalling evidence, paying court fees, and sustaining a matter
          through hearings — none of it is cheap, and someone who cannot afford it rarely has a commercial sponsor.
        </p>
        <p>
          That is the gap we were built for.
        </p>
      </div>

      <div className="section-head reveal d1">
        <span className="no">§ II</span>
        <h2>How we do what we do</h2>
        <span className="line" />
      </div>

      <ol className="process">
        <li className="reveal d1">
          <span className="step-no">01</span>
          <h3>Submission</h3>
          <p>
            A matter comes to us from a citizen, a community, or a volunteer group. We record the facts as submitted,
            without filtering — the record stays intact even if the case is later rejected.
          </p>
        </li>
        <li className="reveal d2">
          <span className="step-no">02</span>
          <h3>Screening by lawyers</h3>
          <p>
            A volunteer lawyer assesses merit, jurisdiction, and whether a public remedy exists. Eligible matters are
            approved; ineligible ones are rejected with a documented reason. Neither step is ever skipped.
          </p>
        </li>
        <li className="reveal d3">
          <span className="step-no">03</span>
          <h3>Public funding</h3>
          <p>
            Approved cases launch on the docket with a goal, a deadline, and a ledger. The public decides which cases
            reach the courtroom, one pledge at a time.
          </p>
        </li>
        <li className="reveal d4">
          <span className="step-no">04</span>
          <h3>Filing and advocacy</h3>
          <p>
            A funded case is assigned to counsel and filed. We track every disbursement — court fees, counsel fees,
            expert evidence — and publish updates after each hearing.
          </p>
        </li>
        <li className="reveal d5">
          <span className="step-no">05</span>
          <h3>Resolution and close</h3>
          <p>
            When a matter resolves — by order, settlement, or withdrawal — we publish the outcome and close the file.
            Accountability runs to the last line of the ledger.
          </p>
        </li>
      </ol>

      <div className="section-head reveal d1">
        <span className="no">§ III</span>
        <h2>The response fund</h2>
        <span className="line" />
      </div>
      <div className="prose reveal">
        <p>
          Some harms will not wait for a campaign. An eviction notice, a demolition order, a riverbed being mined before
          your eyes — these need a lawyer this week, not in forty days. The response fund is a standing pool that lets
          our lawyers act the same day. It is funded by direct contributions, by a quarter of any campaign surplus, and
          by nothing else. Every draw from the fund is recorded on a public ledger, and each urgent matter gets its own
          published case page.
        </p>
      </div>

      <div className="section-head reveal d1">
        <span className="no">§ IV</span>
        <h2>What we hold sacred</h2>
        <span className="line" />
      </div>
      <div className="principles">
        {PRINCIPLES.map((p, i) => (
          <div className={`principle reveal d${i + 1}`} key={p.no}>
            <span className="step-no">{p.no}</span>
            <h3>{p.title}</h3>
            <p>{p.body}</p>
          </div>
        ))}
      </div>

      <div className="about-teaser reveal">
        <p className="kicker">The name</p>
        <h2>Why “Gaerkaanooni”?</h2>
        <p>
          <em>Gaerkaanooni</em> means unlawful. It is what the state does when it demolishes homes without notice,
          detains people without cause, or answers protest with violence. We took the word for it and made it our
          name — because our answer is the law itself: every case screened by lawyers, every rupee audited, every
          matter followed to judgment. They act gaerkaanooni. We sue.
        </p>
        <a href="/" className="button">
          Explore the docket →
        </a>
      </div>
    </main>
  )
}
