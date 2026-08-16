import type { FinancialSummary } from '@pil/db'
import { formatRupees } from '@/lib/money'

export interface StageCounts {
  submitted: number
  live: number
  funded: number
  resolved: number
}

/**
 * Operationally focused KPI strip for the admin dashboard. Money figures come
 * from the audited ledger (`FinancialSummary`) and funnel figures from raw stage
 * counts — pure presentation, no business logic here.
 */
export default function DashboardKpis({
  finance,
  stages,
}: {
  finance: FinancialSummary
  stages: StageCounts
}) {
  const netRaised = finance.totalRaisedPaise - finance.totalRefundedPaise
  return (
    <section className="kpis" aria-label="Key metrics">
      <div className="kpi">
        <span className="kpi-label">Net raised</span>
        <strong className="kpi-value">{formatRupees(netRaised)}</strong>
      </div>
      <div className="kpi">
        <span className="kpi-label">Response fund</span>
        <strong className="kpi-value">{formatRupees(finance.responseFundBalancePaise)}</strong>
      </div>
      <div className="kpi">
        <span className="kpi-label">Submitted</span>
        <strong className="kpi-value">{stages.submitted}</strong>
      </div>
      <div className="kpi">
        <span className="kpi-label">Live</span>
        <strong className="kpi-value">{stages.live}</strong>
      </div>
      <div className="kpi">
        <span className="kpi-label">Funded</span>
        <strong className="kpi-value">{stages.funded}</strong>
      </div>
      <div className="kpi">
        <span className="kpi-label">Resolved</span>
        <strong className="kpi-value">{stages.resolved}</strong>
      </div>
    </section>
  )
}
