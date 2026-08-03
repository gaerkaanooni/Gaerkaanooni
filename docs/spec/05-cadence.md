# 05 — Update Cadence & Status Aging

Active cases must post public updates on a cadence; stalled intake must be flagged. See
`packages/domain/src/update-cadence.ts`.

## 1. Update cadence

- `cadenceDays: 7` (platform config) — a live case owes an update every 7 days.
- `computeNextDueAt(lastUpdateAt, cadenceDays)` = lastUpdateAt + cadenceDays.
- `isUpdateOverdue(lastUpdateAt, now, cadenceDays, activeSinceAt)`:
  - Before the first update, the clock starts at `activeSinceAt` (when the case went live).
  - The case is overdue when `now` is strictly past the next due instant.
- The dashboard's `CaseTable` surfaces `overdueUpdate` flags.

## 2. Stage aging

Stages that can rot while awaiting action have explicit age thresholds
(`DEFAULT_STAGE_AGE_THRESHOLD_DAYS`):

| Stage | Threshold |
|---|---|
| `SUBMITTED` | 1 day |
| `SCREENING` | 3 days |
| `APPROVED` | 3 days |
| `LIVE` | 14 days |
| `AWAITING_FUNDS` | 7 days |
| `EXPIRED` | 7 days |

- `isStageStale(stage, stageEnteredAt, now, thresholds)` — true when the stage has aged past its
  threshold. Stages absent from the map are covered by the update cadence instead, not flagged twice.
- Pre-launch stages are aged from `createdAt`; the dashboard flags them as `Stale stage`.

## 3. Acceptance criteria

- A live case with no update and `activeSinceAt` more than `cadenceDays` ago is flagged overdue.
- A live case with a recent update is not flagged.
- A `SUBMITTED` case older than 1 day is flagged stale.
- Published cases are never flagged "stale stage" (their health signal is the update cadence).
