const PROCESS = [
  {
    no: '01',
    title: 'You raise a matter',
    body: 'Anyone — a citizen, a community, a volunteer group — can submit a case. Volunteer lawyers screen every submission for legal merit, jurisdiction, and public interest before a single rupee is requested.',
  },
  {
    no: '02',
    title: 'The docket funds it',
    body: 'Eligible matters go live on the docket with a public funding goal and a deadline. Backers pledge what they can afford; followers simply show support.',
  },
  {
    no: '03',
    title: 'Goal met, case filed',
    body: 'The moment a campaign reaches its goal, it is assigned to counsel and the petition is filed in court. From then on, every hearing and development is posted as a public update.',
  },
  {
    no: '04',
    title: 'Urgent matters, same day',
    body: 'Some harms cannot wait for a campaign. The response fund — a standing pool — lets our lawyers act the same day on evictions, demolitions, and other time-critical threats.',
  },
]

const MONEY = [
  {
    stat: '95%',
    label: 'reaches the case',
    body: 'A flat 5% covers the platform and payment processing. It is never charged on top — no hidden fees, no percentage creep.',
  },
  {
    stat: '100%',
    label: 'refunded if unmet',
    body: 'If a campaign does not reach its goal by the deadline, every backer is refunded in full. You risk nothing by pledging.',
  },
  {
    stat: 'ledger',
    label: 'public per case',
    body: 'Every paisa is tracked on a per-case ledger. Supporters can see exactly where money goes, from court fees to counsel.',
  },
  {
    stat: '25%',
    label: 'of surplus to the fund',
    body: 'When a case over-funds, a quarter of the surplus flows into the response fund to defend urgent matters.',
  },
]

export default function HowItWorks() {
  return (
    <>
      <div className="section-head reveal">
        <span className="no">§ II</span>
        <h2>How a case reaches court</h2>
        <span className="line" />
      </div>
      <p className="section-lede reveal">
        Bringing a legal matter to court can change a life — but it needs money to move. We help good matters get a
        hearing, whether they affect one person or a whole community. Here is the process, in full.
      </p>

      <ol className="process">
        {PROCESS.map((s, i) => (
          <li className={`reveal d${i + 1}`} key={s.no}>
            <span className="step-no">{s.no}</span>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </li>
        ))}
      </ol>

      <div className="section-head reveal">
        <span className="no">§ III</span>
        <h2>Where the money goes</h2>
        <span className="line" />
      </div>
      <p className="section-lede reveal">
        Trust is the whole point. These rules are not marketing — they are enforced by the platform itself.
      </p>

      <div className="money-grid">
        {MONEY.map((m, i) => (
          <div className={`money-card reveal d${i + 1}`} key={m.label}>
            <span className="stat">{m.stat}</span>
            <h3>{m.label}</h3>
            <p>{m.body}</p>
          </div>
        ))}
      </div>
    </>
  )
}
