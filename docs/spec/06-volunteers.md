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
