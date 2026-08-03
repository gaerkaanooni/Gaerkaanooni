import { describe, expect, it } from 'vitest'
import {
  canTransition,
  InvalidTransitionError,
  type CaseStage,
  type EntryType,
  transition,
} from '../src/lifecycle'

const fundedHappyPath: CaseStage[] = [
  'SUBMITTED',
  'SCREENING',
  'APPROVED',
  'LIVE',
  'FUNDED',
  'ASSIGNED',
  'FILED',
  'IN_PROGRESS',
  'RESOLVED',
]

const dispatchedHappyPath: CaseStage[] = [
  'SUBMITTED',
  'SCREENING',
  'DISPATCHED',
  'LIVE',
  'IN_PROGRESS',
  'RESOLVED',
]

describe('funded-track lifecycle', () => {
  it('walks the full happy path from submission to resolution', () => {
    for (let i = 0; i < fundedHappyPath.length - 1; i++) {
      expect(transition('funded', fundedHappyPath[i]!, fundedHappyPath[i + 1]!)).toBe(
        fundedHappyPath[i + 1],
      )
    }
  })

  it('reaches CLOSED from EXPIRED when the threshold is missed', () => {
    expect(transition('funded', 'LIVE', 'EXPIRED')).toBe('EXPIRED')
    expect(transition('funded', 'EXPIRED', 'CLOSED')).toBe('CLOSED')
  })

  it('rejects a campaign that is not eligible', () => {
    expect(transition('funded', 'SCREENING', 'REJECTED')).toBe('REJECTED')
  })
})

describe('dispatched-track lifecycle', () => {
  it('walks the full happy path, skipping the funding gate', () => {
    for (let i = 0; i < dispatchedHappyPath.length - 1; i++) {
      expect(transition('dispatched', dispatchedHappyPath[i]!, dispatchedHappyPath[i + 1]!)).toBe(
        dispatchedHappyPath[i + 1],
      )
    }
  })

  it('waits in AWAITING_FUNDS when the response fund has no balance, then dispatches', () => {
    expect(transition('dispatched', 'SCREENING', 'AWAITING_FUNDS')).toBe('AWAITING_FUNDS')
    expect(transition('dispatched', 'AWAITING_FUNDS', 'DISPATCHED')).toBe('DISPATCHED')
  })

  it('rejects an unverifiable urgent submission', () => {
    expect(transition('dispatched', 'SCREENING', 'REJECTED')).toBe('REJECTED')
  })
})

describe('invalid transitions throw', () => {
  const cases: Array<[EntryType, CaseStage, CaseStage]> = [
    ['funded', 'SUBMITTED', 'LIVE'], // skipped screening
    ['funded', 'SCREENING', 'FUNDED'], // never went live
    ['funded', 'APPROVED', 'FUNDED'], // threshold before launch
    ['funded', 'LIVE', 'ASSIGNED'], // not yet funded
    ['funded', 'FUNDED', 'FILED'], // lawyer not assigned
    ['funded', 'EXPIRED', 'RESOLVED'], // failed campaign cannot resolve
    ['funded', 'SCREENING', 'SUBMITTED'], // no regression
    ['dispatched', 'SCREENING', 'ASSIGNED'], // dispatched track uses DISPATCHED, not ASSIGNED
    ['dispatched', 'SCREENING', 'FUNDED'], // no funding gate
    ['dispatched', 'AWAITING_FUNDS', 'LIVE'], // cannot go live before dispatch
    ['dispatched', 'DISPATCHED', 'ASSIGNED'], // wrong stage for track
  ]

  for (const [entryType, from, to] of cases) {
    it(`${entryType} ${from} -> ${to} is rejected`, () => {
      expect(() => transition(entryType, from, to)).toThrow(InvalidTransitionError)
      expect(canTransition(entryType, from, to)).toBe(false)
    })
  }

  it('rejects moves into the same stage', () => {
    expect(() => transition('funded', 'LIVE', 'LIVE')).toThrow(InvalidTransitionError)
  })
})

describe('terminal stages', () => {
  const terminal: CaseStage[] = ['REJECTED', 'RESOLVED', 'CLOSED']

  for (const entryType of ['funded', 'dispatched'] as const) {
    for (const stage of terminal) {
      it(`${entryType} does not leave terminal stage ${stage}`, () => {
        expect(canTransition(entryType, stage, 'SUBMITTED')).toBe(false)
        expect(() => transition(entryType, stage, 'SUBMITTED')).toThrow(InvalidTransitionError)
      })
    }
  }
})

describe('cross-track guard', () => {
  it('funded track never reaches dispatched-only stages', () => {
    expect(canTransition('funded', 'SCREENING', 'DISPATCHED')).toBe(false)
    expect(canTransition('funded', 'SCREENING', 'AWAITING_FUNDS')).toBe(false)
  })

  it('dispatched track never reaches funded-only stages', () => {
    expect(canTransition('dispatched', 'SCREENING', 'APPROVED')).toBe(false)
    expect(canTransition('dispatched', 'SCREENING', 'EXPIRED')).toBe(false)
    expect(canTransition('dispatched', 'LIVE', 'FUNDED')).toBe(false)
  })
})
