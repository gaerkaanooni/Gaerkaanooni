import { DomainError } from './errors'

export type VolunteerRole = 'lawyer' | 'verifier' | 'caseManager' | 'comms'
export type VolunteerAvailability = 'available' | 'busy' | 'away'

export interface VolunteerCapacity {
  availability: VolunteerAvailability
  activeCaseCount: number
  capacityLimit: number
}

export function isOverCapacity(activeCaseCount: number, capacityLimit: number): boolean {
  return activeCaseCount >= capacityLimit
}

export function canAssign(volunteer: VolunteerCapacity): boolean {
  return volunteer.availability === 'available' && !isOverCapacity(volunteer.activeCaseCount, volunteer.capacityLimit)
}

export function logHours(hoursContributed: number, increment: number): number {
  if (!Number.isInteger(increment) || increment <= 0) {
    throw new DomainError(`Hours increment must be a positive integer, got ${increment}`)
  }
  return hoursContributed + increment
}
