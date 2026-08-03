# 04 — Response Fund

A shared, un-allocated pool that dispatches urgent cases. See `packages/domain/src/response-fund.ts`
and `packages/db/src/services/finance.ts`.

## 1. Balance

```
balance = (REPLENISHMENT + SURPLUS_SWEEP income) − (RESPONSE_DRAW out)
```

The balance is derived from the ledger — there is no separate "bank account" column, so the number
can always be recomputed from the auditable trail.

## 2. Sources and uses

| Ledger type | Direction | Purpose |
|---|---|---|
| `REPLENISHMENT` | in | Direct donations to the fund; contributions to a dispatched-track case are routed here automatically (`category: directDonation`). |
| `SURPLUS_SWEEP` | in | 25% of campaign surplus on finalize. |
| `RESPONSE_DRAW` | out | Dispatch budget drawn when an urgent case is dispatched. |

## 3. Rules

- **Not seeded at launch** — the fund starts at zero and grows only from the two sources above.
- `canDispatch(balance, budgetPaise)` is true only when balance ≥ budget.
- On dispatch, a `RESPONSE_DRAW` ledger entry is written and the case's `goalAmountPaise` is set to
  the drawn budget (recorded as the dispatch budget).
- If a verified urgent case cannot be fully funded from the balance, it parks in `AWAITING_FUNDS`
  and dispatches later when the fund is replenished (the `dispatchUrgentCase` path accepts
  `AWAITING_FUNDS` as a valid source stage).
- `seedResponseFund` is a test/ops helper only (writes a `REPLENISHMENT`).

## 4. Acceptance criteria

- The fund balance is always exactly income minus draws.
- An empty fund parks urgent cases in `AWAITING_FUNDS` instead of dispatching.
- Contributions to a dispatched-track case replenish the fund, never the case goal.
- Replenished funds let parked cases dispatch without re-verification.
