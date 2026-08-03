import type { FinancialSummary } from '@pil/db'
import { formatRupees } from '@/lib/money'

export default function FinancialSummaryCard({ summary }: { summary: FinancialSummary }) {
  return (
    <dl>
      <dt>Total raised</dt>
      <dd>{formatRupees(summary.totalRaisedPaise)}</dd>
      <dt>Refunded</dt>
      <dd>{formatRupees(summary.totalRefundedPaise)}</dd>
      <dt>Disbursed</dt>
      <dd>{formatRupees(summary.totalDisbursedPaise)}</dd>
      <dt>Response fund</dt>
      <dd>{formatRupees(summary.responseFundBalancePaise)}</dd>
    </dl>
  )
}
