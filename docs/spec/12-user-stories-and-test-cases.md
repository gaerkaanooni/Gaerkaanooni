# 12 — User Stories & Test Cases

User stories and acceptance criteria for the Gaerkaanooni platform, organised by persona and epic,
followed by a test-case catalogue (numbered `T-<epic>-<n>`) that maps 1:1 to the acceptance
criteria. Test cases cover happy paths, business-rule edge cases, and the RBAC/security boundary.

Reference docs: `01-domain-model`, `02-lifecycle`, `03-money`, `04-response-fund`, `05-cadence`,
`06-volunteers`, `07-audit`, `08-auth-rbac`, `09-payments`, `10-analytics`, `11-supabase-infra`.

---

## 1. Personas & Roles

| Persona | Role(s) | Synopsis |
|---|---|---|
| Citizen (unauthenticated) | — | Browses the docket, reads case pages, submits a case, files a referral, signs in. |
| Backer | `PUBLIC`, `BACKER` | Signed-in citizen who pledges, follows cases, and receives refunds. |
| Intern | `INTERN` | Screens submissions, publishes campaigns, posts updates, manages the docket. |
| Lawyer | `LAWYER` | Screens, verifies, dispatches, and updates cases; also a volunteer on record. |
| Verifier | `LAWYER` (volunteer) | Verifies urgent-intake submissions against ground truth. |
| Admin | `ADMIN` | Everything above plus refunds, finalization, finance view, analytics, role changes. |

Cross-cutting rules that all test cases assume:

- Money is integer **paise**; display code renders rupees.
- Platform fee is a flat **5%** of gross, inclusive of the gateway fee (`platformFeePercent = 5`).
- Surplus (contributions beyond goal, net of fee) sweeps **25%** to the response fund.
- Money moves at or above **₹25,000** require sign-off (`signoffLimitPaise`).
- Default urgent dispatch budget is **₹50,000** (`defaultDispatchBudgetPaise`).
- Required public update cadence is **7 days** for live cases (`cadenceDays`).

---

## 2. Epics

### E1. Public browsing (homepage, docket, case pages)

**US-1.1** — As a first-time visitor, I want a homepage that explains what Gaerkaanooni is in a few
lines, so that I understand the concept without reading a wall of text.

**US-1.2** — As a visitor, I want to browse the docket of open campaigns with their funding progress,
so that I can find a matter I care about.

**US-1.3** — As a visitor, I want to open a single case page showing the full story, funding goal,
deadline, progress, supporters, and updates, so that I can judge whether to support it.

**US-1.4** — As a visitor, I want an "About" page explaining the model and the money rules, so that I
can trust the platform before committing.

**US-1.5** — As a visitor on any device, I want a usable mobile layout, so that I can browse from a phone.

Acceptance criteria:
- The homepage shows live stats (open matters, live & funding, committed amount, citizens engaged)
  computed from real data.
- The docket lists only published campaigns (`stage` in the public set); non-live pipeline cases are
  never shown.
- A case page renders the funding bar, countdown, backer/follower counts, description, and update
  feed; it returns 404 for unpublished or non-public cases.
- Navigation is responsive: hamburger menu below 640px, separated links on desktop.

---

### E2. Public authentication (email OTP + Google)

**US-2.1** — As a citizen, I want to sign in with my email via a one-time code, so that I can back,
follow, submit, and refer without a password.

**US-2.2** — As a citizen, I want to sign in with Google, so that I can use an account I already have.

**US-2.3** — As a citizen, I want my session to persist across visits, so that I don't re-authenticate
on every page.

**US-2.4** — As a public user, I must never be able to reach staff surfaces, so that the docket's
integrity is protected.

Acceptance criteria:
- `POST /api/public-auth/otp` validates the email format and returns `{ sent: true }`; in mock mode it
  returns a `devCode` shown in the UI.
- `POST /api/public-auth/otp/verify` rejects an invalid/expired code (400) and issues the
  `pil_session` cookie on success.
- `POST /api/public-auth/google` completes the mock sign-in or redirects to Google's consent screen.
- The "Sign out" control invalidates the session (`POST /api/public-auth/logout`).
- A public (or anonymous) call to `/dashboard` redirects to `/login`; internal APIs return 403.
- Registration (`POST /api/register`) always creates role `PUBLIC`.

---

### E3. Backing & following cases (funded track)

**US-3.1** — As a backer, I want to pledge any positive amount to a live campaign, so that I can fund a
matter within my means.

**US-3.2** — As a backer, I want to know I am only charged if the campaign reaches its goal, so that I
can pledge without risk.

**US-3.3** — As a supporter, I want to follow a case without pledging, so that I can track a matter I
care about.

**US-3.4** — As a backer, I want to see my contribution's fee breakdown, so that I know how much reaches
the case.

Acceptance criteria:
- `backCase` rejects non-positive or non-integer amounts; a `PENDING` contribution is created with the
  fee split (`gross = totalFee + netToCase`, `totalFee = floor(gross × 5%)`).
- `captureContribution` moves `PENDING → CAPTURED`, writes a `CONTRIBUTION` ledger entry (net of fee),
  and audits `contribution.captured`.
- When captured net reaches the goal on a `LIVE` funded-track case, the case flips to `FUNDED`
  (audited `case.funded`).
- Contributions are only accepted on `LIVE`, `FUNDED`, or `DISPATCHED` cases; `followCase` only on the
  same stages.
- Capturing a contribution that is already captured is rejected.

---

### E4. Referrals

**US-4.1** — As a citizen, I want to refer someone who needs a hearing, so that the person is reached
even if they never find the platform.

**US-4.2** — As a citizen, I want the referred person's contact details stored only when that person has
consented, so that privacy is respected.

**US-4.3** — As staff, I want to triage referrals through a status pipeline, so that nobody falls
through the cracks.

Acceptance criteria:
- `createReferral` stores `contact` only when `contactConsented` is true.
- `referral` status flows through `NEW → CONTACTED → ASSISTED → CLOSED`.
- Referrals are listed newest-first for staff.

---

### E5. Urgent intake (response track)

**US-5.1** — As a citizen facing imminent harm (eviction, demolition, etc.), I want a fast intake form
so that my matter can be assessed the same day.

**US-5.2** — As a verifier, I want to verify urgent submissions against ground truth, so that the
response fund is only spent on real, time-critical harms.

**US-5.3** — As staff, I want verified urgent cases to be dispatched immediately when funds allow, so
that the harm is restrained before it happens.

Acceptance criteria:
- `submitUrgent` requires `whatHappened`; creates a `DISPATCHED`-track case at `SUBMITTED` with
  `goalAmountPaise = 0` and a `RESPONSE` submission.
- `verifyUrgentSubmission` only applies to `DISPATCHED`-track `SUBMITTED` cases; a decision reason is
  mandatory.
- Verified + sufficient fund balance ⇒ case dispatches (budget = case goal if set, else ₹50,000).
- Verified + insufficient balance ⇒ case parks in `AWAITING_FUNDS`.
- Rejected submissions go to `REJECTED` with the reason audited.

---

### E6. Response fund

**US-6.1** — As a donor to the response fund, I want every rupee tracked in the public ledger, so that
I can see exactly where it goes.

**US-6.2** — As staff, I want a fund that grows from direct donations and campaign surplus, so that
urgent matters can be defended without a public campaign.

**US-6.3** — As staff, I want parked urgent cases to dispatch automatically once the fund is
replenished, so that no time-critical harm is lost.

Acceptance criteria:
- The balance is derived as `(REPLENISHMENT + SURPLUS_SWEEP) − RESPONSE_DRAW` from the ledger; there is
  no separate balance column.
- A backer contribution to a `DISPATCHED`-track case routes net proceeds to the fund as a
  `REPLENISHMENT` (`category: directDonation`), never to the case goal.
- On finalize, 25% of net surplus is swept as `SURPLUS_SWEEP` to the fund.
- `dispatchUrgentCase` accepts `AWAITING_FUNDS` as a source stage and re-draws without re-verification.
- An empty fund parks cases rather than dispatching (`InsufficientFundsError`).

---

### E7. Case screening & lifecycle (funded track)

**US-7.1** — As an intern or lawyer, I want to screen public submissions, so that only legally merited,
complete matters reach the docket.

**US-7.2** — As an intern, I want to publish an approved campaign with a deadline, so that it opens for
public funding.

**US-7.3** — As staff, I want cases to move through a strict stage machine, so that money and legal
steps happen in the right order.

Acceptance criteria:
- Screening requires a reason and a deciding actor; outcome `APPROVED` or `REJECTED` is recorded in the
  `Screening` record and audited (`case.screened`).
- Publishing requires a future deadline; sets `publishedAt` and `activeSinceAt`, stage → `LIVE`.
- The funded-track machine allows `SUBMITTED→SCREENING→APPROVED→LIVE→FUNDED→ASSIGNED→FILED→IN_PROGRESS→RESOLVED`,
  with `LIVE→EXPIRED→CLOSED` and `REJECTED` as terminal. Any other transition throws
  `InvalidTransitionError`.
- A campaign can only expire after its deadline with the goal unmet; a goal-met campaign cannot expire.
- Only live/funded/dispatched cases may receive support signals (back/follow).

---

### E8. Case updates & cadence

**US-8.1** — As a lawyer or intern, I want to post public updates on live cases, so that supporters see
progress after each hearing.

**US-8.2** — As a supporter, I want updates to arrive on a cadence, so that I know the case is moving
and money is accounted for.

Acceptance criteria:
- `postCaseUpdate` requires a non-empty title and body and a published case.
- Updates render newest-first on the case page with author and date.
- A case is "overdue" when now exceeds `lastUpdate + cadenceDays`; before the first update the clock
  starts at `activeSinceAt`.
- Stage-aging thresholds flag `SUBMITTED` (1d), `SCREENING` (3d), `APPROVED` (3d), `LIVE` (14d),
  `AWAITING_FUNDS` (7d), `EXPIRED` (7d).

---

### E9. Case documents (staff)

**US-9.1** — As a lawyer or admin, I want to upload case documents (petitions, orders, evidence) to a
case, so that the file is complete.

**US-9.2** — As a lawyer or admin, I want to retrieve/download documents, so that I can work from them.

**US-9.3** — As staff, I want case documents private to the team, so that personal legal material is
not publicly exposed.

Acceptance criteria:
- Uploads are restricted to pdf/png/jpeg, size ≤ 20 MB, stored in the private `case-docs` bucket.
- Upload and download routes require a staff role; anonymous/public callers are denied.
- Documents list per case, with the original filename and uploaded-at metadata.

---

### E10. Payments (Razorpay) & webhooks

**US-10.1** — As a backer, I want to pay with Razorpay Checkout when live, so that my pledge is real
and secure.

**US-10.2** — As staff, I want a deterministic payment stub in dev/CI, so that the money path is
testable without credentials.

**US-10.3** — As staff, I want gateway and webhook signatures verified, so that forged payments are
impossible.

Acceptance criteria:
- Stub mode (no `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`): `back` returns `razorpayOrderId: null` and
  `back/confirm` captures immediately.
- Live mode: `back` creates a real order (`receipt = contrib_<id>`); `back/confirm` requires
  `paymentId` + `signature` verified with constant-time HMAC-SHA256.
- The webhook verifies `X-Razorpay-Signature` over the raw body; invalid/missing signatures are rejected
  (400) before any state change.
- Capturing the pledge that crosses the goal flips the case to `FUNDED` (same rule as E3).

---

### E11. Finance: fees, surplus, sign-offs, refunds

**US-11.1** — As an admin, I want a single second-approval threshold on large money moves, so that no
single operator can move big sums alone.

**US-11.2** — As a backer, I want a full refund when a campaign fails, so that I risk nothing.

**US-11.3** — As an admin, I want campaign surplus handled by rule, so that over-funding benefits both
the case and the response fund.

Acceptance criteria:
- Every money move writes a ledger entry **and** an audit entry with a mandatory `reason`.
- Refunds reverse the full gross amount (`REFUND` ledger entry), only from `CAPTURED` contributions,
  and flag `signoffRequired` in audit meta when gross ≥ ₹25,000.
- `refundExpiredCampaign` refunds every captured contribution of an `EXPIRED` case and closes it
  (`EXPIRED → CLOSED`).
- `finalizeFundedCampaign` requires `FUNDED`, deadline passed, and `capturedNet ≥ goal`; surplus sweeps
  `floor(surplus × 25%)` to the fund and audits `surplus.swept`.
- `computeContributionSplit` throws if the gateway fee exceeds the total 5% fee (no negative platform fee).

---

### E12. Volunteer management & dispatch

**US-12.1** — As an admin, I want to track volunteer availability and workload, so that assignments are
balanced.

**US-12.2** — As an admin, I want only available, under-capacity volunteers assigned, so that no one is
overloaded.

Acceptance criteria:
- `canAssign` is true only when the volunteer is `available` and `activeCaseCount < capacityLimit`.
- `logHours` requires a positive integer increment.
- The volunteer directory reports capacity and active workload per volunteer (dashboard).

---

### E13. Dashboard (staff)

**US-13.1** — As staff, I want an operations dashboard with KPIs, the case table, and the volunteer
directory, so that I can run the docket.

Acceptance criteria:
- The dashboard is visible to `INTERN`, `LAWYER`, and `ADMIN` only (page + middleware guard).
- KPIs (total raised, live/funded counts, sign-offs pending) are derived from the ledger/stage tables.
- The case table and volunteer directory render with current data.

---

### E14. Analytics (admin)

**US-14.1** — As an admin, I want operational analytics — totals, money, conversion, top categories,
weekly activity, fund balance — so that I can steer the platform.

Acceptance criteria:
- The page is `ADMIN`-only (`finance.view`); any other role is redirected/403.
- Conversion = funded ÷ (live + funded) × 100; 100% when all live reached goal, 0% when none did.
- Weekly buckets aggregate gross contributions (pre-fee) per 7-day window.
- All metrics are computed from stage/ledger tables, never stored denormalized.

---

### E15. RBAC & security (cross-cutting)

**US-15.1** — As an operator, I want permissions enforced at three layers (middleware, server pages, API
routes), so that a bypass in any one layer still fails closed.

Acceptance criteria (action matrix):

| Action | Allowed | Denied example |
|---|---|---|
| `case.screen` | INTERN, LAWYER, ADMIN | PUBLIC, BACKER, anonymous → 403 |
| `case.publish` | INTERN, LAWYER, ADMIN | PUBLIC → 403 |
| `case.verify`, `case.dispatch` | LAWYER, ADMIN | INTERN → 403 |
| `case.update` | INTERN, LAWYER, ADMIN | PUBLIC → 403 |
| `case.refund`, `case.finalize` | ADMIN | LAWYER → 403 |
| `dashboard.view` | INTERN, LAWYER, ADMIN | PUBLIC → redirect /login |
| `finance.view` | ADMIN | LAWYER → 403 |
| `case.back`, `case.follow` | everyone incl. PUBLIC | none |

- Passwords are bcrypt (10 rounds); plaintext never stored or returned.
- `AUTH_SECRET` is mandatory in all environments.

### E16. Audit trail (cross-cutting)

**US-16.1** — As an admin, I want every state-changing and money-moving action on the record with who,
what, when, and why.

Acceptance criteria:
- Every service call that mutates a case, contribution, fund, or role writes an `AuditLog` row with a
  non-empty `action` and `reason`.
- Audit actions include `submission.created`, `case.screened`, `case.launched`, `case.funded`,
  `case.expired`, `case.closed`, `contribution.captured`, `refund.issued`, `surplus.swept`,
  `response.dispatched`, `case.update.posted`, `user.role-changed`.
- Audit entries referencing an amount always carry integer paise.

---

## 3. Test-Case Catalogue

### E1 — Public browsing

**T-E1-01 Homepage renders live stats**
Prereq: seeded DB with ≥1 live campaign.
1. GET `/`.
Expected: 200; hero shows concept lines; stat strip shows open matters, live & funding, committed INR,
citizens engaged; docket lists the live campaign with a funding bar.

**T-E1-02 Homepage excludes pipeline cases**
Prereq: one `LIVE` case, one `SUBMITTED`, one `SCREENING`, one `AWAITING_FUNDS`.
1. GET `/`.
Expected: only the `LIVE` case (and any public set case) appears; pipeline cases absent.

**T-E1-03 Campaign detail page**
Prereq: a published `LIVE` case with 2 updates and 1 backer.
1. GET `/campaigns/<id>`.
Expected: title, category + region + registry line, stamp stage, description, funding bar with
percentage, countdown, backer/supporter counts, updates newest-first.

**T-E1-04 Campaign detail 404 for unpublished**
Prereq: a `SUBMITTED` case.
1. GET `/campaigns/<id>`.
Expected: 404.

**T-E1-05 Mobile navigation**
1. Load `/` at viewport 375×667.
Expected: brand + hamburger on one row; tapping opens a vertical dropdown; tapping a link closes it and
navigates; CTAs are full-width and ≥44px tall.

**T-E1-06 Desktop navigation separators**
1. Load `/` at viewport ≥1280.
Expected: links separated by `·` markers; no overflow; brand left, links right.

---

### E2 — Public authentication

**T-E2-01 Email OTP — valid email (mock)**
Prereq: no Supabase keys configured.
1. POST `/api/public-auth/otp` `{ email: "a@b.com" }`.
Expected: 200 `{ sent: true, devCode: "123456" }` (6 digits).

**T-E2-02 Email OTP — invalid email**
1. POST `/api/public-auth/otp` `{ email: "not-an-email" }`.
Expected: 400 with a validation error.

**T-E2-03 Verify OTP — correct code (mock)**
1. POST `/api/public-auth/otp/verify` with `{ email, code }` from T-E2-01.
Expected: 200; response sets `pil_session` cookie; subsequent `/` shows "Sign out".

**T-E2-04 Verify OTP — wrong / expired code**
1. POST verify with a wrong code (and with a code from a stale 10-minute window).
Expected: 400 "Invalid or expired code"; no session cookie.

**T-E2-05 Google sign-in (mock)**
1. POST `/api/public-auth/google`.
Expected: 200 `{ url: "", mock: true }`; session established; UI shows "Sign out".

**T-E2-06 Public user redirected away from dashboard**
Prereq: authenticated as PUBLIC (or anonymous).
1. GET `/dashboard`.
Expected: redirect to `/login`; never renders dashboard content.

**T-E2-07 Registration creates PUBLIC**
1. POST `/api/register` with name + email + password.
Expected: 201; user role is `PUBLIC`; audit `user.role-changed` absent (initial role only).

**T-E2-08 Sign out**
Prereq: authenticated.
1. POST `/api/public-auth/logout`.
Expected: session cookie invalidated; `/` no longer shows "Sign out".

---

### E3 — Backing & following

**T-E3-01 Back — valid pledge**
Prereq: `LIVE` funded-track case with goal ₹1,00,000.
1. POST `/api/campaigns/<id>/back` `{ grossAmountPaise: 10_000 }` (₹100).
Expected: 201; contribution `PENDING`; split `gross=10000, totalFee=500, netToCase=9500`; backer row
created.

**T-E3-02 Back — invalid amounts**
1. POST `back` with `grossAmountPaise` = 0, −500, 1.5, "abc".
Expected: 400 for each; no contribution created.

**T-E3-03 Back — wrong stage**
Prereq: case in `SUBMITTED` / `EXPIRED` / `CLOSED`.
1. POST `back`.
Expected: 400 "Only live campaigns accept contributions"; no row.

**T-E3-04 Capture — happy path**
1. POST `back` then POST `/api/campaigns/<id>/back/confirm`.
Expected: contribution `CAPTURED`; `CONTRIBUTION` ledger entry `+9500`; audit `contribution.captured`.

**T-E3-05 Capture — already captured rejected**
1. Attempt a second capture on the same contribution.
Expected: 400 "Cannot capture a contribution in status CAPTURED".

**T-E3-06 Goal reached flips to FUNDED**
Prereq: `LIVE` case, goal ₹1,00,000 (₹1,00,000 = 1_00_00_000 paise).
1. Back ₹1,00,000; confirm.
Expected: case stage → `FUNDED`; audit `case.funded` records captured net.

**T-E3-07 Follow — supported stages**
1. POST `/api/campaigns/<id>/follow` on `LIVE`, `FUNDED`, `DISPATCHED` cases.
Expected: 200/201; `FOLLOWER` backer row each time.

**T-E3-08 Follow — unsupported stage**
1. POST follow on `SUBMITTED` / `CLOSED`.
Expected: 400 "Only published cases accept support signals".

**T-E3-09 Anonymous support allowed**
Prereq: no session.
1. POST `back`/`follow` with `backerId: "anonymous"`.
Expected: succeeds for both (money path and follow path accept anonymous).

---

### E4 — Referrals

**T-E4-01 Create referral with consent**
1. POST `/api/referrals` with `contactConsented: true` and a contact.
Expected: 201; row stores `contact`.

**T-E4-02 Create referral without consent**
1. POST `/api/referrals` with `contactConsented: false` and a contact.
Expected: 201; row has `contact: null` despite the submitted value.

**T-E4-03 Referral status flow**
1. POST create; then PATCH `/api/referrals/<id>` status `CONTACTED`, `ASSISTED`, `CLOSED`.
Expected: each update 200; invalid status rejected.

**T-E4-04 Referral list ordering**
1. Create two referrals at different times; GET `/api/referrals`.
Expected: newest first.

---

### E5 — Urgent intake

**T-E5-01 Submit urgent — valid**
1. POST `/api/response-intake` `{ whatHappened: "...", where, when, applicantName, contact }`.
Expected: 201; case `DISPATCHED` track, stage `SUBMITTED`, `goalAmountPaise: 0`; `RESPONSE` submission;
audit `submission.created`.

**T-E5-02 Submit urgent — missing whatHappened**
1. POST with empty `whatHappened`.
Expected: 400.

**T-E5-03 Verify — verified with funds ⇒ dispatch**
Prereq: fund balance ≥ ₹50,000.
1. POST verify `{ verified: true, reason }` (LAWYER).
Expected: case → `DISPATCHED`; `RESPONSE_DRAW` ledger `−50,000` (default budget); `goalAmountPaise =
50,000`; audit `response.dispatched`.

**T-E5-04 Verify — verified without funds ⇒ awaiting**
Prereq: fund balance ₹0.
1. POST verify `{ verified: true }`.
Expected: case → `AWAITING_FUNDS`; audit `case.awaiting-funds`.

**T-E5-05 Verify — rejected**
1. POST verify `{ verified: false, reason }`.
Expected: case → `REJECTED`; audit `case.verified` with rejection reason.

**T-E5-06 Verify — wrong case type/stage**
1. Verify a funded-track case; or verify an already-verified case.
Expected: 400 for both.

**T-E5-07 Dispatch parked case on replenishment**
Prereq: case in `AWAITING_FUNDS`.
1. Replenish fund ≥ budget; POST dispatch (LAWYER).
Expected: case → `DISPATCHED`; draw recorded; no re-verification required.

---

### E6 — Response fund

**T-E6-01 Balance derivation**
Prereq: fund income ₹1,00,000, one draw ₹50,000.
1. Read `getResponseFundBalance`.
Expected: ₹50,000 (income − draws), recomputable from ledger.

**T-E6-02 Contribution to dispatched case replenishes fund**
Prereq: `DISPATCHED` (LIVE response) case.
1. POST back ₹10,000; confirm.
Expected: `REPLENISHMENT` ledger `+9,500` (net of fee), category `directDonation`; case goal untouched.

**T-E6-03 Dispatch blocked when balance insufficient**
1. Attempt dispatch with balance < budget.
Expected: `InsufficientFundsError`; no ledger write; case stage unchanged.

**T-E6-04 Surplus sweep on finalize**
Prereq: `FUNDED` case, goal ₹1,00,000, captured net ₹2,00,000, deadline passed.
1. POST finalize (ADMIN).
Expected: `SURPLUS_SWEEP` ledger `+25,000` (25% of ₹1,00,000 surplus); audit `surplus.swept`.

---

### E7 — Screening & lifecycle

**T-E7-01 Screen — approve**
Prereq: `SUBMITTED` funded-track case.
1. POST `/api/campaigns/<id>/screen` `{ decidedBy, isEligible: true, reason }`.
Expected: stage → `APPROVED`; `Screening` record created; audit `case.screened`.

**T-E7-02 Screen — reject**
1. POST screen `{ isEligible: false, reason }`.
Expected: stage → `REJECTED`; terminal.

**T-E7-03 Screen — missing reason/actor**
1. POST screen without `reason` or `decidedBy`.
Expected: 400.

**T-E7-04 Publish — with future deadline**
Prereq: `APPROVED` case.
1. POST `/api/campaigns/<id>/publish` with future `deadlineAt`.
Expected: stage → `LIVE`; `publishedAt`/`activeSinceAt` set; audit `case.launched`.

**T-E7-05 Publish — no/past deadline**
1. POST publish without deadline, and with a past deadline.
Expected: 400 for both; stage unchanged.

**T-E7-06 Invalid transitions rejected**
1. Attempt `LIVE → ASSIGNED` on a funded-track case (skipping `FUNDED`), or `SUBMITTED → LIVE`.
Expected: `InvalidTransitionError`; stage unchanged.

**T-E7-07 Expire — valid**
Prereq: `LIVE` case, deadline in the past, goal unmet.
1. POST expire (INTERN).
Expected: stage → `EXPIRED`; audit `case.expired`.

**T-E7-08 Expire — before deadline or goal met**
1. Expire a `LIVE` case before its deadline; expire one whose captured net ≥ goal.
Expected: 400 both; no stage change.

---

### E8 — Updates & cadence

**T-E8-01 Post update — valid**
Prereq: published case.
1. POST `/api/campaigns/<id>/updates` `{ authorId, title, body }`.
Expected: 201; update visible on the case page newest-first; audit `case.update.posted`.

**T-E8-02 Post update — missing title/body**
1. POST with empty `title` or `body`.
Expected: 400.

**T-E8-03 Post update — unpublished case**
1. POST update on a `SUBMITTED` case.
Expected: 400 "Only cases that have gone live accept updates".

**T-E8-04 Cadence math**
Prereq: `cadenceDays = 7`.
1. Update posted at `T0`; compute due at `T0 + 7d`.
Expected: `isUpdateOverdue` false at `T0 + 6d`, true at `T0 + 8d`; before any update, reference =
`activeSinceAt`.

**T-E8-05 Stage aging flags**
1. Check each threshold: `SUBMITTED` 1d, `SCREENING` 3d, `APPROVED` 3d, `LIVE` 14d,
   `AWAITING_FUNDS` 7d, `EXPIRED` 7d.
Expected: `isStageStale` true only past the configured threshold; unlisted stages never stale.

---

### E9 — Case documents

**T-E9-01 Upload document (staff)**
Prereq: staff session.
1. POST `/api/cases/<id>/documents` with a PDF ≤ 20 MB.
Expected: 201; document listed with filename and timestamp; stored in `case-docs`.

**T-E9-02 Upload rejected for public/anonymous**
Prereq: no session / PUBLIC session.
1. POST the same route.
Expected: 403.

**T-E9-03 Upload invalid type / oversize**
1. Upload a `.exe`; upload a 30 MB file.
Expected: 400 for both.

**T-E9-04 Download document (staff)**
Prereq: an uploaded document + staff session.
1. GET `/api/cases/<id>/documents/<docId>`.
Expected: 200, correct content type; anonymous/public → 403.

---

### E10 — Payments

**T-E10-01 Stub back → confirm**
Prereq: no Razorpay keys.
1. POST `back` (₹100) then `back/confirm`.
Expected: `back` returns `razorpayOrderId: null`; confirm 200; contribution `CAPTURED`.

**T-E10-02 Live back creates order**
Prereq: `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` set.
1. POST `back`.
Expected: order created at `api.razorpay.com/v1/orders`; `razorpayOrderId` stored; `receipt =
contrib_<id>`; response includes `razorpayKeyId` + amount.

**T-E10-03 Live confirm — valid signature**
1. POST `back/confirm` with valid `paymentId` + `signature`.
Expected: 200; contribution captured.

**T-E10-04 Live confirm — tampered signature**
1. POST `back/confirm` with a tampered signature.
Expected: 400; contribution remains `PENDING`.

**T-E10-05 Webhook — valid signature**
1. POST `/api/razorpay/webhook` `payment.captured` with valid `X-Razorpay-Signature` over raw body.
Expected: contribution matched by `razorpayOrderId` captured.

**T-E10-06 Webhook — missing/invalid signature**
1. POST webhook without signature, and with an invalid one.
Expected: 400 before any state change.

**T-E10-07 Final pledge across goal flips FUNDED**
Prereq: `LIVE`, goal ₹1,00,000, current captured ₹99,000.
1. Back + confirm ₹1,000.
Expected: case → `FUNDED`; audit `case.funded`.

---

### E11 — Finance

**T-E11-01 Fee split math**
1. `computeContributionSplit(10000, 0)`.
Expected: `totalFee 500, platformFee 500, netToCase 9500`.
2. `computeContributionSplit(10000, 400)`.
Expected: `platformFee 100, netToCase 9500`.

**T-E11-02 Gateway fee cannot exceed total fee**
1. `computeContributionSplit(10000, 600)`.
Expected: `DomainError` (gateway 600 > total 500).

**T-E11-03 Refund — single contribution**
Prereq: `CAPTURED` contribution, gross ₹5,000.
1. POST refund (ADMIN) with reason.
Expected: contribution `REFUNDED`; `REFUND` ledger `+5,000` (full gross); audit `refund.issued` with
`signoffRequired: false`.

**T-E11-04 Refund — sign-off flagged at/over ₹25,000**
1. Refund a contribution with gross ₹25,000.
Expected: audit meta `signoffRequired: true`; refund still recorded.

**T-E11-05 Refund — non-captured rejected**
1. Refund a `PENDING` or already-`REFUNDED` contribution.
Expected: 400.

**T-E11-06 Bulk refund expired campaign**
Prereq: `EXPIRED` case with 3 captured contributions.
1. POST `refundExpiredCampaign`.
Expected: all 3 → `REFUNDED`; case → `CLOSED`; audit `case.closed`; 3 `refund.issued` entries.

**T-E11-07 Finalize — valid**
Prereq: `FUNDED`, deadline passed, capturedNet ≥ goal, no surplus.
1. POST finalize (ADMIN).
Expected: success; no sweep; audit only.

**T-E11-08 Finalize — not funded / early / short**
1. Finalize a case in `LIVE`; finalize before deadline; finalize with `capturedNet < goal`.
Expected: 400 all three; stage unchanged.

**T-E11-09 Every money move is audited with a reason**
Prereq: run T-E11-03.
1. Query `AuditLog` for the contribution.
Expected: `action = refund.issued`, non-empty `reason`, integer `amountPaise`.

---

### E12 — Volunteers

**T-E12-01 Assignment respects capacity**
1. `canAssign({ available, activeCaseCount: 4, capacityLimit: 5 })`.
Expected: true.
2. `canAssign({ available, activeCaseCount: 5, capacityLimit: 5 })`.
Expected: false (at capacity).
3. `canAssign({ busy, activeCaseCount: 0, capacityLimit: 5 })`.
Expected: false.

**T-E12-02 Log hours validation**
1. `logHours(10, 2)`.
Expected: 12.
2. `logHours(10, 0)` / `logHours(10, -1)` / `logHours(10, 1.5)`.
Expected: `DomainError`.

**T-E12-03 Volunteer directory**
1. GET the volunteer directory (staff).
Expected: per-volunteer role, region, availability, capacity, active case count.

---

### E13 — Dashboard

**T-E13-01 Staff sees dashboard**
Prereq: staff session (INTERN/LAWYER/ADMIN).
1. GET `/dashboard`.
Expected: 200; KPIs (total raised, counts), case table, volunteer directory.

**T-E13-02 Dashboard denied for non-staff**
Prereq: PUBLIC session; anonymous.
1. GET `/dashboard`.
Expected: redirect to `/login` (middleware) and never renders data.

**T-E13-03 KPI values derived from ledger**
Prereq: a captured contribution of ₹10,000 with ₹9,500 net.
1. Read dashboard "Total raised".
Expected: shows ₹9,500 (net, not gross).

---

### E14 — Analytics

**T-E14-01 Admin sees analytics**
Prereq: ADMIN session.
1. GET `/analytics`.
Expected: 200; totals, money, conversion, top categories, weekly activity, fund balance.

**T-E14-02 Non-admin denied**
Prereq: LAWYER/INTERN/PUBLIC session.
1. GET `/analytics`.
Expected: redirect/403; no metrics rendered.

**T-E14-03 Conversion boundary values**
1. All live reached goal.
Expected: conversion 100%.
2. None reached goal.
Expected: conversion 0%.

**T-E14-04 Weekly buckets use gross**
Prereq: contributions in the current and previous 3 ISO weeks.
1. Read weekly activity.
Expected: 4 buckets, each summing gross (pre-fee) contributions in that week.

---

### E15 — RBAC & security

**T-E15-01 API rejects unauthenticated callers**
1. POST `/api/campaigns` (submit), `/api/campaigns/<id>/screen`, `/api/campaigns/<id>/publish`,
   `/api/campaigns/<id>/updates` without a session.
Expected: 403 for each (auth-guarded), no state change.

**T-E15-02 Staff role boundaries**
Prereq: sessions for INTERN, LAWYER, ADMIN.
1. INTERN tries `case.verify`, `case.dispatch`, `case.refund`, `case.finalize`, `/analytics`.
Expected: 403 for all (finance/verify/dispatch/refund are LAWYER/ADMIN or ADMIN-only).
2. LAWYER tries `case.refund`, `case.finalize`, `/analytics`.
Expected: 403.
3. ADMIN performs each.
Expected: allowed.

**T-E15-03 Back/follow open to all**
1. PUBLIC and anonymous call `back`/`follow` on a live case.
Expected: allowed for both.

**T-E15-04 Passwords hashed**
Prereq: a registered user.
1. Inspect `User.passwordHash`.
Expected: bcrypt digest (not plaintext); API never returns `passwordHash`.

**T-E15-05 `AUTH_SECRET` required**
1. Boot the web app without `AUTH_SECRET`.
Expected: startup/auth failure; guarded by config validation.

---

### E16 — Audit trail

**T-E16-01 Full lifecycle audit**
Prereq: run the funded-track happy path end-to-end.
1. Inspect `AuditLog` after: submit → screen → publish → back → confirm → finalize.
Expected: rows for `submission.created`, `case.screened`, `case.launched`, `contribution.captured`,
`case.funded`, `surplus.swept`; each with actor/case/amount/reason/createdAt.

**T-E16-02 Audit requires a reason**
1. Attempt `createAuditEntry` with an empty `reason` or `action`.
Expected: `DomainError`.

**T-E16-03 Audit amounts are integer paise**
1. Attempt `createAuditEntry` with `amountPaise: 10.5`.
Expected: `DomainError`.

---

## 4. Automation Mapping

The catalogue above maps to the existing automated suites, which are the enforced contract:

| Layer | Location | Covers |
|---|---|---|
| Domain unit | `packages/domain/test/*` | T-E11-01/02, T-E12-01/02, E7 transitions, E8 cadence, E16-02/03, fees, fund draw |
| DB integration | `packages/db/test/*` | E3, E5, E6, E7, E8-01/03, E11-03..09, E13, E14 |
| Web unit | `apps/web/src/lib/*.test.ts` | payments signatures (T-E10-04/05/06) |
| E2E | `apps/web/e2e/campaigns.spec.ts` | public browsing, back→funded, staff dashboard, RBAC guards, referral/urgent intake forms |

Suggested next automated additions (not yet covered):
- E2E for the **email OTP** happy path (mock mode) including the wrong-code rejection.
- E2E for **urgent intake → verify → dispatch** and **dispatch parked on replenishment**.
- E2E for **expire → bulk refund → closed**.
- Component tests for the **referral form** consent-conditional contact storage.
- E2E for the **case-documents** upload/download with RBAC denial.