import { describe, expect, it } from 'vitest'
import { DomainError } from '../src/errors'
import { canAssign, isOverCapacity, logHours } from '../src/volunteers'

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
