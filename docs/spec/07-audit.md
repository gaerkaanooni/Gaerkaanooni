# 07 — Audit Trail & Sign-Off

Every action that moves money or changes a case writes a durable audit entry. See
`packages/domain/src/audit.ts` and `packages/db/src/services/audit.ts`.

## 1. Audit entry

An `AuditLog` row is not FK-constrained on purpose — the trail must outlive the case row it
references. Each entry has:

- `action` — machine-readable verb, e.g. `submission.created`, `case.screened`, `case.launched`,
  `contribution.captured`, `refund.issued`, `response.dispatched`, `surplus.swept`,
  `case.update.posted`, `case.funded`, `user.role-changed`.
- `actorId` — who did it (null for public intake).
- `caseId` — the case (nullable for platform-wide events).
- `amountPaise` — money moved, when applicable.
- `reason` — mandatory free-text "why".
- `meta` — JSON detail (e.g. `signoffRequired`, `gatewayFeeReversed`).
- `createdAt`.

`createAuditEntry` rejects empty actions and missing reasons: the trail always answers "why".

## 2. Which actions require an entry

Anything that moves money (back, capture, refund, dispatch draw, surplus sweep) and every stage
transition driven by a human (screen, publish, verify, launch, fund, close, finalize) writes at
least one entry.

## 3. Sign-off workflow

- `requiresSignOff(amountPaise, signoffLimitPaise)` — true at or above ₹25,000
  (`defaultConfig.signoffLimitPaise`).
- Applied to: refunds (`meta.signoffRequired`) and dispatch budgets (`meta.signoffRequired`).
- The dashboard surfaces `needsSignoff` per case from any audit entry whose `meta.signoffRequired`
  is true, so ops can see which money movements await a second approval.

## 4. Acceptance criteria

- No money-moving action completes without a reason-bearing audit entry.
- A ₹25,000+ refund and a dispatch draw are flagged for sign-off.
- The dashboard's `needsSignoff` flag derives from the audit trail, not a separate field.
