# 03 — Money & Fees

All money is integer paise, never floats. See `packages/domain/src/money.ts`.

## 1. Amounts

- `toPaise(rupees)` converts rupees to paise; `assertIntegerPaise` rejects non-integer values.
- `isBackAmountValid(amountPaise)` requires a positive integer of paise.
- Platform config (`packages/domain/src/config.ts`): `platformFeePercent: 5`, `signoffLimitPaise: 25_000 * 100`.

## 2. Contribution split

Given a gross amount in paise and the gateway's fee in paise:

```
totalFeePaise   = floor(grossPaise × platformFeePercent / 100)
platformFeePaise = totalFeePaise − gatewayFeePaise
netToCasePaise  = grossPaise − totalFeePaise
```

- The platform fee is inclusive of the gateway fee; whatever the gateway keeps, the platform keeps
  the remainder. The case is never charged on top of the 5% headline.
- `netToCasePaise` is what counts toward the campaign goal.

## 3. Threshold

`isThresholdMet(capturedNet, goalPaise)` — a `LIVE` case flips to `FUNDED` the moment cumulative
*captured net* reaches the goal. The transition is evaluated on every captured contribution
(`captureContribution`).

## 4. Refunds

- A refund returns **100% of gross** to the backer, regardless of the split.
- The gateway-fee reversal is recorded in the audit `meta.gatewayFeeReversed`.
- `requiresSignOff(amountPaise, signoffLimitPaise)` is true for amounts ≥ the limit (₹25,000).
  Refunds at or above the limit are flagged `meta.signoffRequired: true` and surfaced on the
  dashboard's `needsSignoff` flag for a second pair of eyes.

## 5. Surplus sweep

When a funded campaign is finalized, surplus = capturedNet − goal. `surplusToFundPercent: 25` of the
surplus is swept into the response fund as a `SURPLUS_SWEEP` ledger entry; the rest stays with the
case for disbursement.

## 6. Acceptance criteria

- Any back amount that is not a positive integer of paise is rejected with `DomainError`.
- The net credited to a case equals gross minus 5% platform fee, with the gateway fee carved out of
  that 5% (never added on top).
- A live campaign reaches `FUNDED` exactly when captured net ≥ goal.
- Refunds always return full gross; sign-off is flagged at ₹25,000 and above.
- Overage on a funded campaign splits 25% to the response fund / 75% stays with the case.
