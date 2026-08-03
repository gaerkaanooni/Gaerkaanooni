# 10 — Analytics

Admin-only operational metrics. See `packages/db/src/services/analytics.ts` and the `/analytics`
page (guarded by `finance.view`, i.e. `ADMIN` only).

## 1. Metrics

- **Totals** — submissions, live, funded, expired, closed, dispatched, awaiting-funds (derived by
  stage counts).
- **Money** — total raised (captured net), refunded, average pledge, backer count.
- **Conversion** — funded vs (live + funded), as a percentage.
- **Top categories** — case counts grouped by category, highest first.
- **Recent weekly activity** — last 4 weeks bucketed by ISO week of the contribution: count and
  gross amount per week.
- **Response fund balance** — same derived balance as the dashboard.

## 2. Acceptance criteria

- Every metric is computed from the ledger/stage tables, never stored denormalized.
- The conversion rate is 100% when every live campaign reached its goal, 0% when none did.
- Weekly buckets aggregate gross contributions (pre-fee) per 7-day window.
- The page returns 403 (or redirects) for any role other than ADMIN.
