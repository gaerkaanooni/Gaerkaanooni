import { describe, expect, it } from 'vitest'
import { DomainError } from '../src/errors'
import {
  assertDecidable,
  canAssign,
  isOverCapacity,
  logHours,
  parseAvailability,
  validateLawyerApplication,
} from '../src/volunteers'

describe('isOverCapacity', () => {
  it('flags a volunteer at their capacity limit', () => {
    expect(isOverCapacity(3, 3)).toBe(true)
    expect(isOverCapacity(4, 3)).toBe(true)
  })

  it('does not flag a volunteer below capacity', () => {
    expect(isOverCapacity(2, 3)).toBe(false)
  })
})

describe('canAssign', () => {
  it('assigns an available volunteer who is under capacity', () => {
    expect(canAssign({ availability: 'available', activeCaseCount: 2, capacityLimit: 3 })).toBe(true)
  })

  it('blocks a volunteer who is busy or away', () => {
    expect(canAssign({ availability: 'busy', activeCaseCount: 1, capacityLimit: 3 })).toBe(false)
    expect(canAssign({ availability: 'away', activeCaseCount: 1, capacityLimit: 3 })).toBe(false)
  })

  it('blocks an available volunteer who is at capacity', () => {
    expect(canAssign({ availability: 'available', activeCaseCount: 3, capacityLimit: 3 })).toBe(false)
  })
})

describe('logHours', () => {
  it('accumulates positive hour increments', () => {
    expect(logHours(10, 3)).toBe(13)
    expect(logHours(0, 1)).toBe(1)
  })

  it('rejects negative or non-integer increments', () => {
    expect(() => logHours(10, -1)).toThrow(DomainError)
    expect(() => logHours(10, 0.5)).toThrow(DomainError)
    expect(() => logHours(10, 0)).toThrow(DomainError)
  })
})

describe('validateLawyerApplication', () => {
  const valid = {
    fullName: 'Asha Rao',
    barCouncilId: 'DL/1017/2015',
    yearsPractice: 9,
    skills: ['ENVIRONMENT', 'HOUSING'],
  }

  it('accepts a valid application and applies defaults', () => {
    const clean = validateLawyerApplication(valid)
    expect(clean.fullName).toBe('Asha Rao')
    expect(clean.capacityLimit).toBe(2)
    expect(clean.region).toBeNull()
    expect(clean.motivation).toBeNull()
  })

  it('dedupes specialisations', () => {
    const clean = validateLawyerApplication({ ...valid, skills: ['ENVIRONMENT', 'ENVIRONMENT'] })
    expect(clean.skills).toEqual(['ENVIRONMENT'])
  })

  it('rejects missing names, unknown specialisations, and bad numbers', () => {
    expect(() => validateLawyerApplication({ ...valid, fullName: 'A' })).toThrow(DomainError)
    expect(() => validateLawyerApplication({ ...valid, barCouncilId: '' })).toThrow(DomainError)
    expect(() => validateLawyerApplication({ ...valid, skills: ['ASTROLOGY'] })).toThrow(DomainError)
    expect(() => validateLawyerApplication({ ...valid, yearsPractice: -1 })).toThrow(DomainError)
    expect(() => validateLawyerApplication({ ...valid, yearsPractice: 4.5 })).toThrow(DomainError)
    expect(() => validateLawyerApplication({ ...valid, capacityLimit: 21 })).toThrow(DomainError)
    expect(() => validateLawyerApplication({ ...valid, capacityLimit: 0 })).toThrow(DomainError)
  })
})

describe('assertDecidable', () => {
  it('allows only PENDING applications to be decided', () => {
    expect(() => assertDecidable('PENDING')).not.toThrow()
    expect(() => assertDecidable('APPROVED')).toThrow(DomainError)
    expect(() => assertDecidable('REJECTED')).toThrow(DomainError)
  })
})

describe('parseAvailability', () => {
  it('normalises case and rejects junk', () => {
    expect(parseAvailability('BUSY')).toBe('busy')
    expect(parseAvailability('away')).toBe('away')
    expect(parseAvailability('vacationing')).toBeNull()
    expect(parseAvailability(42)).toBeNull()
  })
})
