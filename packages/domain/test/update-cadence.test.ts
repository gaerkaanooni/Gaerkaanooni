import { describe, expect, it } from 'vitest'
import { DEFAULT_STAGE_AGE_THRESHOLD_DAYS, computeNextDueAt, isStageStale, isUpdateOverdue } from '../src/update-cadence'
import type { CaseStage } from '../src/lifecycle'

const NOW = new Date('2026-08-02T12:00:00Z')

function days(n: number): number {
  return n * 24 * 60 * 60 * 1000
}

describe('computeNextDueAt', () => {
  it('adds the cadence to the last update', () => {
    const due = computeNextDueAt(NOW, 7)
    expect(due.getTime()).toBe(NOW.getTime() + days(7))
  })

  it('rejects a non-positive cadence', () => {
    expect(() => computeNextDueAt(NOW, 0)).toThrow()
    expect(() => computeNextDueAt(NOW, -3)).toThrow()
  })
})

describe('isUpdateOverdue', () => {
  it('is not overdue while the last update is within cadence', () => {
    expect(isUpdateOverdue(NOW, new Date(NOW.getTime() + days(6)), 7)).toBe(false)
  })

  it('is overdue past the due point', () => {
    expect(isUpdateOverdue(NOW, new Date(NOW.getTime() + days(7) + 1), 7)).toBe(true)
  })

  it('treats a case with no updates yet as due from its activation time', () => {
    expect(isUpdateOverdue(null, new Date(NOW.getTime() + days(7) + 1), 7, NOW)).toBe(true)
    expect(isUpdateOverdue(null, new Date(NOW.getTime() + days(6)), 7, NOW)).toBe(false)
  })

  it('is not overdue exactly at the due instant', () => {
    expect(isUpdateOverdue(NOW, new Date(NOW.getTime() + days(7)), 7)).toBe(false)
  })
})

describe('isStageStale', () => {
  it('flags a stage that has sat past its threshold', () => {
    expect(isStageStale('SCREENING', NOW, new Date(NOW.getTime() + days(3) + 1), DEFAULT_STAGE_AGE_THRESHOLD_DAYS)).toBe(true)
  })

  it('does not flag a stage still within its threshold, including the exact boundary', () => {
    expect(isStageStale('SCREENING', NOW, new Date(NOW.getTime() + days(3)), DEFAULT_STAGE_AGE_THRESHOLD_DAYS)).toBe(false)
  })

  it('flags an awaiting-funds case that has waited too long for a replenishment', () => {
    expect(isStageStale('AWAITING_FUNDS', NOW, new Date(NOW.getTime() + days(7) + 1), DEFAULT_STAGE_AGE_THRESHOLD_DAYS)).toBe(true)
  })

  it('returns false for stages with no configured threshold', () => {
    expect(isStageStale('FILED' as CaseStage, NOW, new Date(NOW.getTime() + days(400)), DEFAULT_STAGE_AGE_THRESHOLD_DAYS)).toBe(false)
  })
})
