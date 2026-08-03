export { InvalidTransitionError } from './errors'
import { InvalidTransitionError } from './errors'

export type EntryType = 'funded' | 'dispatched'

export type CaseStage =
  | 'SUBMITTED'
  | 'SCREENING'
  | 'APPROVED'
  | 'REJECTED'
  | 'LIVE'
  | 'FUNDED'
  | 'EXPIRED'
  | 'AWAITING_FUNDS'
  | 'DISPATCHED'
  | 'ASSIGNED'
  | 'FILED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED'

export const ALL_STAGES: readonly CaseStage[] = [
  'SUBMITTED',
  'SCREENING',
  'APPROVED',
  'REJECTED',
  'LIVE',
  'FUNDED',
  'EXPIRED',
  'AWAITING_FUNDS',
  'DISPATCHED',
  'ASSIGNED',
  'FILED',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
]

const TRANSITIONS: Record<EntryType, Readonly<Partial<Record<CaseStage, readonly CaseStage[]>>>> = {
  funded: {
    SUBMITTED: ['SCREENING'],
    SCREENING: ['APPROVED', 'REJECTED'],
    APPROVED: ['LIVE'],
    LIVE: ['FUNDED', 'EXPIRED'],
    FUNDED: ['ASSIGNED'],
    ASSIGNED: ['FILED'],
    FILED: ['IN_PROGRESS'],
    IN_PROGRESS: ['RESOLVED'],
    EXPIRED: ['CLOSED'],
    RESOLVED: [],
    CLOSED: [],
    REJECTED: [],
  },
  dispatched: {
    SUBMITTED: ['SCREENING'],
    SCREENING: ['DISPATCHED', 'AWAITING_FUNDS', 'REJECTED'],
    AWAITING_FUNDS: ['DISPATCHED'],
    DISPATCHED: ['LIVE'],
    LIVE: ['IN_PROGRESS'],
    IN_PROGRESS: ['RESOLVED'],
    RESOLVED: [],
    REJECTED: [],
  },
}

export function canTransition(entryType: EntryType, from: CaseStage, to: CaseStage): boolean {
  if (from === to) return false
  const allowed = TRANSITIONS[entryType][from]
  return allowed?.includes(to) ?? false
}

export function transition(entryType: EntryType, from: CaseStage, to: CaseStage): CaseStage {
  if (!canTransition(entryType, from, to)) {
    throw new InvalidTransitionError(entryType, from, to)
  }
  return to
}
