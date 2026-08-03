import { formatRupees } from '@/lib/money'

export default function FundingProgress({
  raisedPaise,
  goalPaise,
}: {
  raisedPaise: number
  goalPaise: number
}) {
  const percent = goalPaise > 0 ? Math.min(100, Math.round((raisedPaise / goalPaise) * 100)) : 0
  return (
    <section className="funding" aria-label="Funding progress">
      <p className="funding-figures">
        <strong>{formatRupees(raisedPaise)}</strong>
        <span>raised of {formatRupees(goalPaise)} goal</span>
        <span className="funding-percent">{percent}%</span>
      </p>
      <div className="funding-track">
        <div className="funding-bar" data-testid="funding-bar" style={{ width: `${percent}%` }} />
      </div>
    </section>
  )
}
