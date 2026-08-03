import { describe, expect, it } from 'vitest'
import { assertRole, canPerform } from '../src/roles'
import { DomainError } from '../src/errors'

describe('canPerform', () => {
  it('lets staff screen and publish, never the public', () => {
    expect(canPerform('INTERN', 'case.screen')).toBe(true)
    expect(canPerform('LAWYER', 'case.publish')).toBe(true)
    expect(canPerform('PUBLIC', 'case.screen')).toBe(false)
    expect(canPerform('BACKER', 'case.publish')).toBe(false)
  })

  it('restricts verification and dispatch to lawyer-level roles', () => {
    expect(canPerform('LAWYER', 'case.verify')).toBe(true)
    expect(canPerform('ADMIN', 'case.dispatch')).toBe(true)
    expect(canPerform('INTERN', 'case.verify')).toBe(false)
    expect(canPerform('INTERN', 'case.dispatch')).toBe(false)
  })

  it('restricts refunds and finalization to admins', () => {
    expect(canPerform('ADMIN', 'case.refund')).toBe(true)
    expect(canPerform('LAWYER', 'case.refund')).toBe(false)
    expect(canPerform('ADMIN', 'case.finalize')).toBe(true)
    expect(canPerform('LAWYER', 'case.finalize')).toBe(false)
  })

  it('restricts finance views to admins but dashboard to all staff', () => {
    expect(canPerform('INTERN', 'dashboard.view')).toBe(true)
    expect(canPerform('BACKER', 'dashboard.view')).toBe(false)
    expect(canPerform('ADMIN', 'finance.view')).toBe(true)
    expect(canPerform('LAWYER', 'finance.view')).toBe(false)
  })

  it('lets everyone back and follow', () => {
    expect(canPerform('PUBLIC', 'case.back')).toBe(true)
    expect(canPerform('BACKER', 'case.follow')).toBe(true)
    expect(canPerform(null, 'case.back')).toBe(false)
  })
})

describe('assertRole', () => {
  it('throws for a denied action', () => {
    expect(() => assertRole('PUBLIC', 'case.screen')).toThrow(DomainError)
  })
  it('passes for an allowed action', () => {
    expect(() => assertRole('ADMIN', 'case.refund')).not.toThrow()
  })
})
