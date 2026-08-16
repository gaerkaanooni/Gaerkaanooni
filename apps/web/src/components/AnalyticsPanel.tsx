import type { Analytics } from '@pil/db'
import { categoryLabel, isCategory } from '@pil/domain'
import { formatRupees } from '@/lib/money'

export default function AnalyticsPanel({ analytics }: { analytics: Analytics }) {
  const { totals, money, conversion, topCategories, recentWeekly, responseFundBalancePaise } = analytics
  return (
    <>
      <section aria-label="Totals">
        <h2>Totals</h2>
        <p>
          {totals.submissions} submissions · {totals.live} live · {totals.funded} funded · {totals.dispatched}{' '}
          dispatched · {totals.awaitingFunds} awaiting funds
        </p>
      </section>
      <section aria-label="Money">
        <h2>Money</h2>
        <p>
          {formatRupees(money.totalRaisedPaise)} raised · {formatRupees(money.totalRefundedPaise)} refunded ·{' '}
          {formatRupees(money.avgBackPaise)} avg pledge · {money.backerCount} backers
        </p>
        <p>Response fund: {formatRupees(responseFundBalancePaise)}</p>
      </section>
      <section aria-label="Conversion">
        <h2>Conversion</h2>
        <p>
          {conversion.fundedCampaigns} of {conversion.liveCampaigns + conversion.fundedCampaigns} funded (
          {conversion.ratePercent}%)
        </p>
      </section>
      <section aria-label="Categories">
        <h2>Top categories</h2>
        <ul>
          {topCategories.map((c) => (
            <li key={c.category}>
              {isCategory(c.category) ? categoryLabel(c.category) : c.category}: {c.count}
            </li>
          ))}
        </ul>
      </section>
      <section aria-label="Weekly activity">
        <h2>Weekly contributions</h2>
        <ul>
          {recentWeekly.map((w) => (
            <li key={w.week}>
              {w.week}: {w.contributions} contributions ({formatRupees(w.grossPaise)})
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
