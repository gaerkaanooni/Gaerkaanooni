import ReferForm from '@/components/ReferForm'

export const metadata = {
  title: 'Refer someone — Gaerkaanooni',
}

export default function ReferPage() {
  return (
    <main>
      <section className="hero reveal">
        <p className="kicker">You can be the reason someone gets heard</p>
        <h1>Know someone who needs a fair hearing?</h1>
        <p className="lede">
          The hardest part of a legal fight is often just starting it — and asking for help is hard when a person has
          been carrying the problem alone. If you know someone with a genuine matter who cannot afford a lawyer, you
          can put it forward for them. You don't need to be their lawyer, their family, or even identified.
        </p>
        <p className="explainer">
          Our volunteer lawyers review every referral. There is no value placed on a person's circumstances — only on
          whether the matter deserves a hearing, and how we can help them reach it.
        </p>
      </section>

      <div className="section-head reveal d1">
        <span className="no">§ I</span>
        <h2>What happens after you refer</h2>
        <span className="line" />
      </div>
      <ol className="refer-steps reveal d1" aria-label="What happens after you refer">
        <li className="refer-step">
          <span className="step-no">01</span>
          <h3>You send the referral</h3>
          <p>A few plain sentences are enough. You can stay anonymous.</p>
        </li>
        <li className="refer-step">
          <span className="step-no">02</span>
          <h3>A volunteer lawyer reviews it</h3>
          <p>They check whether it is a genuine matter worth a hearing — judgment never lands on a person&rsquo;s circumstances.</p>
        </li>
        <li className="refer-step">
          <span className="step-no">03</span>
          <h3>We reach out, gently</h3>
          <p>Only if the person has agreed to be contacted. Nothing appears publicly without their okay.</p>
        </li>
      </ol>
      <p className="refer-privacy reveal d2">
        Privacy is the point of this page. The person you are helping is never labeled by their circumstances, and
        their contact is only stored once they have chosen to be reached.
      </p>

      <div className="section-head reveal d1">
        <span className="no">§ II</span>
        <h2>Refer a matter</h2>
        <span className="line" />
      </div>
      <div className="narrow">
        <p className="section-lede reveal">
          Tell us who needs the hearing and what is going on. You can choose to stay anonymous, and you never have to
          share their contact unless they have agreed to be reached.
        </p>
        <div className="reveal d1">
          <ReferForm />
        </div>
      </div>
    </main>
  )
}
