import { DomainError } from './errors'
import { isCategory } from './categories'

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

// ---- Lawyer applications ------------------------------------------------
//
// The public signup side: a practising lawyer applies through /volunteer,
// staff review the application, and approval provisions a `Volunteer` row.
// See docs/spec/06-volunteers.md §5.

export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

/** A lawyer's specialisations are legal-matter categories (see categories.ts). */
export type Specialization = string

export const MIN_CAPACITY_LIMIT = 1
export const MAX_CAPACITY_LIMIT = 20
export const MAX_YEARS_PRACTICE = 70

export interface LawyerApplicationInput {
  fullName: string
  barCouncilId: string
  yearsPractice: number
  skills: readonly string[]
  region?: string | null
  capacityLimit?: number
  motivation?: string | null
}

function requireText(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || value.trim().length < 2) {
    throw new DomainError(`${field} is required`)
  }
  const trimmed = value.trim()
  if (trimmed.length > max) {
    throw new DomainError(`${field} must be at most ${max} characters`)
  }
  return trimmed
}

/**
 * Validate + normalise a lawyer application. Throws DomainError on any invalid
 * field; returns the normalised values the service should persist.
 */
export function validateLawyerApplication(input: Partial<LawyerApplicationInput>): {
  fullName: string
  barCouncilId: string
  yearsPractice: number
  skills: string[]
  region: string | null
  capacityLimit: number
  motivation: string | null
} {
  const fullName = requireText(input.fullName, 'Full name', 120)
  const barCouncilId = requireText(input.barCouncilId, 'Bar council ID', 60)

  const years = input.yearsPractice
  if (!Number.isInteger(years) || (years as number) < 0) {
    throw new DomainError('Years of practice must be a whole number, zero or more')
  }
  if ((years as number) > MAX_YEARS_PRACTICE) {
    throw new DomainError(`Years of practice must be at most ${MAX_YEARS_PRACTICE}`)
  }

  if (!Array.isArray(input.skills) || input.skills.length === 0) {
    throw new DomainError('Pick at least one area of practice')
  }
  const skills: string[] = []
  for (const raw of input.skills) {
    const skill = String(raw)
    if (!isCategory(skill)) {
      throw new DomainError(`Unknown area of practice: ${skill}`)
    }
    if (!skills.includes(skill)) skills.push(skill)
  }

  let region: string | null = null
  if (input.region != null && String(input.region).trim()) {
    region = requireText(input.region, 'Region', 80)
  }

  const capacityLimit = input.capacityLimit == null ? 2 : input.capacityLimit
  if (!Number.isInteger(capacityLimit) || capacityLimit < MIN_CAPACITY_LIMIT || capacityLimit > MAX_CAPACITY_LIMIT) {
    throw new DomainError(
      `Concurrent case limit must be between ${MIN_CAPACITY_LIMIT} and ${MAX_CAPACITY_LIMIT}`,
    )
  }

  let motivation: string | null = null
  if (input.motivation != null && String(input.motivation).trim()) {
    motivation = requireText(input.motivation, 'Motivation', 2000)
  }

  return {
    fullName,
    barCouncilId,
    yearsPractice: years as number,
    skills,
    region,
    capacityLimit,
    motivation,
  }
}

/**
 * An application can only be decided while PENDING, and a decision is final
 * (rejection is revisited by the applicant re-applying, not by re-deciding).
 */
export function assertDecidable(status: ApplicationStatus): void {
  if (status !== 'PENDING') {
    throw new DomainError(`Application has already been ${status.toLowerCase()}`)
  }
}

const AVAILABILITIES: readonly VolunteerAvailability[] = ['available', 'busy', 'away']

/** Normalise an availability value coming from untrusted input ('BUSY' → 'busy'). */
export function parseAvailability(value: unknown): VolunteerAvailability | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  return (AVAILABILITIES as readonly string[]).includes(normalized)
    ? (normalized as VolunteerAvailability)
    : null
}
