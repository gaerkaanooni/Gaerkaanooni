# 01 — Domain Model

One platform, one case model. The two tracks differ only in where a case enters the lifecycle.

## 1. Core principle

A case is a single entity. Its `entryType` decides whether it starts at `SUBMISSION` (must clear a
funding threshold before legal work) or at `DISPATCH` (skips the funding gate, draws on the response
fund, because it cannot wait). Every downstream surface — campaign page, update feed, lawyer
directory, dashboard, analytics — operates on the same case object.

## 2. Entities

### 2.1 Case

| Field | Type | Notes |
|---|---|---|
| `id` | string (cuid) | |
| `entryType` | `'funded' \| 'dispatched'` | The single entry-point field. |
| `title` | string | |
| `summary` | string | What the issue is, who it affects, what remedy is sought. |
| `category` | string enum | e.g. civil-liberties, environment, labor, consumer, other. |
| `region` | string | For analytics + lawyer matching. |
| `stage` | enum | Lifecycle stage — see 02-lifecycle.md. |
| `goalAmountPaise` | integer | Funding goal for `funded` cases; dispatch budget estimate for `dispatched`. |
| `deadlineAt` | datetime \| null | Campaign deadline (`funded`). Null for `dispatched`. |
| `publishedAt` | datetime \| null | When the public campaign page went live. |
| `assignedVolunteerIds` | string[] | Derived from Assignments. |
| `timestamps` | createdAt / updatedAt | |

Invariants:
- `goalAmountPaise` is a positive integer (paise).
- A `funded` case must not reach `FILED` without `FUNDED`; a `dispatched` case must not require `FUNDED`.

### 2.2 Submission

The intake record for both tracks.

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `caseId` | string | |
| `track` | `'campaign' \| 'response'` | Which intake form produced it. |
| `whatHappened` | string | |
| `where` | string | |
| `when` | string | |
| `applicantName` | string \| null | Null if anonymous. |
| `contact` | string \| null | Email/phone. Null if anonymous. |
| `onBehalfOf` | string \| null | If submitted for someone else. |
| `isAnonymous` | boolean | |

Sensitivity: `Submission` contains the most sensitive PII (response-track submissions may involve
minors / politically sensitive matters). It is never rendered on public pages.

### 2.3 Screening

| Field | Type | Notes |
|---|---|---|
| `caseId` | string | |
| `completenessPassed` | boolean | First pass. |
| `duplicateOfCaseId` | string \| null | Duplicate check. |
| `isEligible` | boolean \| null | Lawyer review. Null until decided. |
| `reason` | string | Given either way. |
| `decidedBy` | string | Volunteer id. |
| `decidedAt` | datetime | |

### 2.4 Backer

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `caseId` | string | |
| `kind` | `'follower' \| 'backer'` | Free signal vs. money on the table. |
| `userId` | string \| null | Null for anonymous backers. |
| `createdAt` | datetime | |

### 2.5 Contribution (ledger-level)

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `caseId` | string | |
| `backerId` | string | |
| `grossAmountPaise` | integer | What the backer pays. |
| `gatewayFeePaise` | integer | Actual Razorpay cut (settled). |
| `platformFeePaise` | integer | `totalFee − gatewayFee`, where `totalFee = gross × 5%`. |
| `totalFeePaise` | integer | `gross × 5%` (floored), inclusive of gateway. |
| `netToCasePaise` | integer | `gross − totalFee`. Counts toward goal. |
| `status` | `'pending' \| 'captured' \| 'refunded'` | Escrow lifecycle. |
| `razorpayOrderId` | string \| null | |
| `createdAt` | datetime | |

Money rule: all monetary fields are integer paise. Floats are forbidden.

### 2.6 Volunteer

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `role` | `'lawyer' \| 'verifier' \| 'caseManager' \| 'comms'` | |
| `skills` | string[] | Specialization tags (lawyers) / skills (others). |
| `region` | string \| null | |
| `availability` | `'available' \| 'busy' \| 'away'` | |
| `capacityLimit` | integer | Max concurrent active cases. |
| `activeCaseCount` | integer | Derived. |
| `hoursContributed` | integer | For pro-bono cert / CSR reporting. |

Capacity rule: `activeCaseCount >= capacityLimit` → volunteer is over capacity, flagged, not auto-assignable.

### 2.7 Assignment

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `caseId` | string | |
| `volunteerId` | string | |
| `kind` | `'primary' \| 'support'` | |
| `assignedAt` | datetime | |
| `status` | `'active' \| 'released'` | |

### 2.8 CaseUpdate

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `caseId` | string | |
| `authorId` | string | |
| `title` | string | |
| `body` | string | |
| `published` | boolean | Publicly visible on campaign page. |
| `createdAt` | datetime | |

### 2.9 UpdateCadence

| Field | Type | Notes |
|---|---|---|
| `caseId` | string | |
| `requiredEveryDays` | integer | Config default 7. |
| `lastUpdateAt` | datetime \| null | |
| `nextDueAt` | datetime | `lastUpdateAt + requiredEveryDays`. Null until first update. |

Overdue rule: now > `nextDueAt` → case flagged.

### 2.10 LedgerEntry (money trail)

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `type` | enum | `contribution`, `refund`, `responseDraw`, `replenishment`, `fee`, `disbursement`, `surplusSweep` |
| `caseId` | string \| null | Null for fund-level entries. |
| `amountPaise` | integer | Signed per direction. |
| `category` | enum \| null | `courtFee`, `lawyerDisbursement`, `filing`, `misc`, `directDonation`, `surplusSweep`. |
| `note` | string | |
| `createdAt` | datetime | |

### 2.11 ResponseFund

A singleton ledger account, not a table. Its balance is the running sum of
`replenishment` minus `responseDraw` entries. Starts at 0 (no seed — founder decision).

Replenishment sources (exactly two): direct donations, surplus sweeps.
Draw rule: a draw is only valid when `balance >= amountPaise`.

### 2.12 Disbursement

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `caseId` | string | |
| `category` | enum | `courtFee`, `lawyerDisbursement`, `filing`, `misc`. |
| `amountPaise` | integer | |
| `approvedBy` | string | |
| `approvedAt` | datetime | |
| `signoffRequired` | boolean | True when `amountPaise >= signoffLimitPaise`. |

### 2.13 AuditLog (durable log)

Any action that moves money writes one.

| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `action` | string | e.g. `contribution.captured`, `case.funded`, `refund.issued`, `response.dispatch`. |
| `actorId` | string \| null | Who/what triggered it. Null for system. |
| `caseId` | string \| null | |
| `amountPaise` | integer \| null | |
| `reason` | string | Why. |
| `meta` | json | Before/after snapshot. |
| `createdAt` | datetime | |

### 2.14 LawyerApplication

A practising lawyer's application to join the volunteer panel (public `/volunteer` signup). See
06-volunteers.md §5.

| Field | Type | Notes |
|---|---|---|
| `id` | string (cuid) | |
| `userId` | string \| null | Public-session identity; no FK (mirrors Backer.userId). |
| `email` | string, unique | The application key; re-application after rejection resets the row. |
| `fullName`, `barCouncilId`, `yearsPractice` | string / string / int | Bar ID verified manually in v1. |
| `skills` | string[] | `Category` values — exact match against cases. |
| `region`, `capacityLimit`, `motivation` | string \| null / int / string \| null | Capacity default 2. |
| `status` | `'PENDING' \| 'APPROVED' \| 'REJECTED'` | Decision is final; rejection allows re-apply. |
| `decisionReason`, `decidedBy`, `decidedAt` | string / string / datetime | Mandatory reason. |

Invariant: approval provisions exactly one `User(role=LAWYER)` + `Volunteer` pair per approved email.

### 2.15 AssignmentRequest

A volunteer's offer to help on a case ("request → staff confirms"). Unique per
`(caseId, volunteerId)`; a declined or withdrawn request can be re-made later by resetting the row.

| Field | Type | Notes |
|---|---|---|
| `id` | string (cuid) | |
| `caseId`, `volunteerId` | string | |
| `status` | `'PENDING' \| 'APPROVED' \| 'DECLINED'` | Withdrawal records as DECLINED with reason "Withdrawn by volunteer". |
| `note` | string \| null | Applicant's message when offering. |
| `decisionReason`, `decidedBy`, `decidedAt` | string / string / datetime | |

Invariant: no `Assignment` is created without an APPROVED request, and confirmation re-checks the
volunteer's availability/capacity inside the transaction (the hard gate).

## 3. Role model

`admin` | `intern` | `lawyer` | `backer` | `public`. Full matrix in 04-access-control.md.

## 4. Acceptance criteria

- [ ] AC-1: A case is created from a submission with `entryType` set from the intake track.
- [ ] AC-2: Money fields are only expressible as integers; the domain rejects float amounts.
- [ ] AC-3: A response-track submission can be created with zero of: name, contact (anonymous or on-behalf-of), while campaign-track submissions always require an applicant.
- [ ] AC-4: The response fund balance derives purely from `replenishment − responseDraw` ledger entries and starts at 0.
- [ ] AC-5: A volunteer with `activeCaseCount >= capacityLimit` reports as over capacity.
- [ ] AC-6: Every money-moving action (contribution capture, refund, response draw, disbursement, surplus sweep) writes an AuditLog entry.
