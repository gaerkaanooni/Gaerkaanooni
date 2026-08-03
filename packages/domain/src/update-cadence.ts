import type { CaseStage } from './lifecycle'
import { DomainError } from './errors'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Stage age thresholds in days — founder-call knobs. Stages absent from this map are not flagged
 * by status aging (they are covered by the update cadence instead).
 */
export const DEFAULT_STAGE_AGE_THRESHOLD_DAYS: Readonly<Partial<Record<CaseStage, number>>> = {
  SUBMITTED: 1,
  SCREENING: 3,
  APPROVED: 3,
  LIVE: 14,
  AWAITING_FUNDS: 7,
  EXPIRED: 7,
}

export function computeNextDueAt(lastUpdateAt: Date, cadenceDays: number): Date {
  if (!Number.isInteger(cadenceDays) || cadenceDays <= 0) {
    throw new DomainError(`Cadence must be a positive integer of days, got ${cadenceDays}`)
  }
  return new Date(lastUpdateAt.getTime() + cadenceDays * DAY_MS)
}

/**
 * A case is overdue for an update when `now` is strictly past its next due instant. Before the
 * first update, the clock starts at `activeSinceAt` (when the case first went live).
 */
export function isUpdateOverdue(
  lastUpdateAt: Date | null,
  now: Date,
  cadenceDays: number,
  activeSinceAt?: Date,
): boolean {
  const reference = lastUpdateAt ?? activeSinceAt
  if (!reference) return false
  return now.getTime() > computeNextDueAt(reference, cadenceDays).getTime()
}

export function isStageStale(
  stage: CaseStage,
  stageEnteredAt: Date,
  now: Date,
  thresholds: Readonly<Partial<Record<CaseStage, number>>>,
): boolean {
  const thresholdDays = thresholds[stage]
  if (thresholdDays == null) return false
  return now.getTime() - stageEnteredAt.getTime() > thresholdDays * DAY_MS
}
