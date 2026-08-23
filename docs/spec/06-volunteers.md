# 06 — Volunteers

Lawyers, verifiers, case managers, and comms, with explicit load limits. See
`packages/domain/src/volunteers.ts`.

## 1. Roles and availability

- `VolunteerRole`: `LAWYER`, `VERIFIER`, `CASE_MANAGER`, `COMMS`.
- `Availability`: `AVAILABLE`, `BUSY`, `AWAY`.
- Each volunteer has a `capacityLimit` (default 5) and `hoursContributed`.

## 2. Assignment rules

- `canAssign(activeAssignments, capacityLimit, availability)` — a volunteer can take a new assignment
  only when under capacity.
- `isOverCapacity(activeAssignments, capacityLimit)` — at/above limit.
- `logHours(previous, add)` — integer hours, non-negative.
- `Assignments` have a kind (`PRIMARY` / `SUPPORT`) and status (`ACTIVE` / `RELEASED`); a case can
  have one primary and any number of support assignments. `(caseId, volunteerId)` is unique.

## 3. Directory (dashboard)

`getVolunteerDirectory` reports name, role, availability, region, capacity, `activeAssignments`
(count of ACTIVE assignments), and `hoursContributed`, so a case manager can see load at a glance.

## 4. Acceptance criteria

- A volunteer at capacity is not assignable to another case.
- Released assignments do not count against the active load.
- Hours are integer and never negative.

## 5. Volunteer-lawyer side (signup → review → engagement)

The self-service side added on top of §1–3. One lifecycle:

```
apply (/volunteer)  →  staff review (dashboard)  →  approved  →  engage (/volunteer)
```

### 5.1 Application

- Public page `/volunteer`; applying requires a signed-in public session (email OTP / Google), so
  every application is tied to a verified email (`userId` mirrors Backer.userId: no FK).
- Fields: name, bar council enrolment number (manual verification only in v1), years of practice,
  areas of practice (`Category` values — exact matching against cases), region, concurrent-case
  capacity (default 2), optional motivation.
- Email is the application key: one live application per email. Re-applying after REJECTED resets
  the same row to PENDING; PENDING/APPROVED emails cannot apply again.
- Domain validation lives in `validateLawyerApplication` (`packages/domain/src/volunteers.ts`).

### 5.2 Review

- The dashboard shows the pending queue; deciding requires `volunteer.review` (**ADMIN only**,
  see 08-auth-rbac.md) with a mandatory reason.
- **Approval provisions atomically**: upserts a `User` (role `LAWYER` — an existing ADMIN/INTERN is
  never downgraded) plus their `Volunteer` panel row carrying skills/region/capacity from the
  application. Both decisions write audit entries (`volunteer.application-approved/-rejected`).

### 5.3 Engagement (request → staff confirms)

- Approved lawyers see their engagement board at `/volunteer`: commitment card (availability,
  capacity, logged hours), open published matters (stages `LIVE … IN_PROGRESS`), their assignments
  and pending offers, and pro-bono hour logging.
- "Offer to help" files an `AssignmentRequest` (`PENDING`). It does **not** create an assignment or
  consume capacity. Filing soft-checks availability/capacity so obviously-full volunteers don't file
  dead requests; duplicates per `(caseId, volunteerId)` are blocked while pending.
- Coordinators confirm/decline from the dashboard. **Confirmation is the hard gate**: availability
  and capacity are re-checked inside the transaction before the `Assignment` (`SUPPORT`) is created
  or re-activated — a stale offer can never over-commit anyone.
- Volunteers may withdraw pending offers; declines carry a reason and allow re-offering later.
- Self-service claims are always `SUPPORT`; `PRIMARY` remains a coordinator decision.
- Every step is audited: `volunteer.request-made/-approved/-declined/-withdrawn`,
  `volunteer.hours-logged`, `volunteer.preferences-updated`.

## 6. Acceptance criteria (volunteer-lawyer side)

- [ ] An unauthenticated visitor cannot submit an application (`401`).
- [ ] Approval creates exactly one User + Volunteer pair per approved email; a pre-existing
      ADMIN/INTERN role survives approval unchanged.
- [ ] A rejected applicant can re-apply; an approved one cannot.
- [ ] No Assignment exists without a coordinator confirmation; confirming re-checks capacity inside
      the transaction.
- [ ] A volunteer at capacity cannot file new offers; releasing frees the slot immediately.
- [ ] Hours accept positive integers only; every mutation lands in the audit log.
