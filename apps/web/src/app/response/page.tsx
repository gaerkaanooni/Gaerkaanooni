import ResponseIntakeForm from '@/components/ResponseIntakeForm'

export const metadata = {
  title: 'Urgent intake — Gaerkaanooni',
}

export default function ResponsePage() {
  return (
    <main>
      <section className="hero reveal">
        <p className="kicker">Urgent response · for harms that cannot wait</p>
        <h1>Help today — when waiting could make it worse</h1>
        <p className="lede">
          Some harms do not wait for a fundraising cycle: an eviction scheduled for tomorrow, a demolition, a person
          held without cause. Our response fund lets volunteer lawyers act the same day, with the money already in
          place.
        </p>
        <p className="explainer">
          Tell us what is happening as plainly as you can. You do not need legal language, and you do not need to be
          the person directly affected — you can speak for them. We will assess urgency first.
        </p>
      </section>

      <div className="section-head reveal d1">
        <span className="no">§ I</span>
        <h2>Urgent intake form</h2>
        <span className="line" />
      </div>
      <div className="narrow">
        <p className="section-lede reveal">
          The more clearly you can say <em>what</em> is scheduled, <em>where</em>, and <em>by when</em>, the faster we
          can help.
        </p>
        <div className="reveal d1">
          <ResponseIntakeForm />
        </div>
      </div>
    </main>
  )
}
