# 02 — Case Lifecycle & State Machine

Single state machine, one `entryType` field. A case may never leave its track's stage set, and no
transition outside the tables below is allowed. Terminal stages (`REJECTED`, `RESOLVED`, `CLOSED`)
reject all transitions.

## 1. Stages

| Stage | Meaning |
|---|---|
| `SUBMITTED` | Intake record received. |
| `SCREENING` | Completeness + duplicate check, then volunteer-lawyer eligibility review. |
| `APPROVED` | Eligible; ready to launch (funded track only). |
| `REJECTED` | Not eligible / unverifiable (reason recorded). Terminal. |
| `LIVE` | Public campaign page is up. |
| `FUNDED` | Cumulative net-of-fee contributions ≥ goal. |
| `EXPIRED` | Deadline passed with goal unmet. |
| `AWAITING_FUNDS` | Verified urgent, but response fund balance < dispatch cost. |
| `DISPATCHED` | Lawyer dispatched; response fund draw recorded. |
| `ASSIGNED` | Lawyer assigned after funding (funded track). |
| `FILED` | Case filed in court. |
| `IN_PROGRESS` | Active litigation. |
| `RESOLVED` | Matter concluded. Terminal. |
| `CLOSED` | Failed campaign, refunds issued. Visible, not hidden. Terminal. |

## 2. Transition tables

### 2.1 funded track (enters at Submission, gated on funding)

```
SUBMITTED  → SCREENING
SCREENING  → APPROVED | REJECTED
APPROVED   → LIVE
LIVE       → FUNDED | EXPIRED
FUNDED     → ASSIGNED
ASSIGNED   → FILED
FILED      → IN_PROGRESS
IN_PROGRESS→ RESOLVED
EXPIRED    → CLOSED
```

### 2.2 dispatched track (enters post-gate; response fund instead of a threshold)

```
SUBMITTED      → SCREENING
SCREENING      → DISPATCHED | AWAITING_FUNDS | REJECTED
AWAITING_FUNDS → DISPATCHED     (when fund balance allows)
DISPATCHED     → LIVE
LIVE           → IN_PROGRESS
IN_PROGRESS    → RESOLVED
```

## 3. Rules

- **No regression.** A case can only move forward through its track's stages.
- **No cross-track stages.** `funded` never touches `DISPATCHED` / `AWAITING_FUNDS`;
  `dispatched` never touches `APPROVED` / `FUNDED` / `EXPIRED` / `ASSIGNED` / `FILED` / `CLOSED`.
- **Reflexive moves are invalid** (`LIVE → LIVE` throws).
- **Terminal means terminal.** No outgoing edge from `REJECTED`, `RESOLVED`, `CLOSED`.
- Dispatch must not wait for a funding cycle: the `SCREENING → DISPATCHED` edge exists only when
  the response fund already has balance. Otherwise the case parks in `AWAITING_FUNDS` and is
  re-checked when a replenishment lands.

## 4. Implementation note

`packages/domain/src/lifecycle.ts` exports `transition(entryType, from, to)` which returns the next
stage and throws `InvalidTransitionError` on any disallowed edge; `canTransition` returns a boolean.
Persistence and API layers call these and then persist the resulting stage.

## 5. Acceptance criteria

- [ ] AC-1: Both happy paths above traverse cleanly, stage by stage.
- [ ] AC-2: Every invalid edge in §2 throws `InvalidTransitionError`.
- [ ] AC-3: Terminal stages reject all transitions on both tracks.
- [ ] AC-4: Cross-track stages are unreachable on both tracks.
- [ ] AC-5: A dispatched case can enter and leave `AWAITING_FUNDS` exactly once (park → dispatch).
