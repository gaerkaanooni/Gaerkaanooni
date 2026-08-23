import Link from 'next/link'
import type { PublicCampaign } from '@pil/db'
import FundingProgress from '@/components/FundingProgress'
import Countdown from '@/components/Countdown'

const STAGGER = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6']

export default function CampaignList({ campaigns }: { campaigns: PublicCampaign[] }) {
  if (campaigns.length === 0) {
    return (
      <div className="docket-empty reveal">
        <p className="kicker">The docket is being prepared</p>
        <h3>No open matters right now</h3>
        <p>
          Screening and fundraising for the first matters is underway. If you know of a legal injustice that needs a
          hearing — or a person who needs help to reach one — you can help start it today.
        </p>
        <div className="cta-row">
          <Link href="/submit" className="button">
            Submit a case
          </Link>
          <Link href="/refer" className="button ghost">
            Refer someone who needs a hearing
          </Link>
        </div>
      </div>
    )
  }
  return (
    <ul>
      {campaigns.map((c, i) => (
        <li className={`campaign-card reveal ${STAGGER[i % STAGGER.length]}`} key={c.id}>
          <p className="case-no">
            <span>matter № {String(i + 1).padStart(4, '0')}</span>
            <span className={`stage stage-${c.stage.toLowerCase()}`}>{c.stage.replace(/_/g, ' ')}</span>
          </p>
          <Link href={`/campaigns/${c.id}`}>
            <h2>{c.title}</h2>
          </Link>
          <p className="summary">{c.summary}</p>
          {c.entryType === 'DISPATCHED' ? (
            <p className="funding response-funded">
              <span aria-hidden="true">⚡</span> Urgent matter · funded from the response fund
            </p>
          ) : (
            <FundingProgress raisedPaise={c.raisedPaise} goalPaise={c.goalAmountPaise} />
          )}
          <p className="meta">
            {c.region && <span>{c.region}</span>}
            <span>
              {c.supporterCount} supporter{c.supporterCount === 1 ? '' : 's'}
            </span>
            {c.deadlineAt && (
              <>
                <span aria-hidden="true">·</span>
                <Countdown deadlineAt={c.deadlineAt} />
              </>
            )}
          </p>
        </li>
      ))}
    </ul>
  )
}
