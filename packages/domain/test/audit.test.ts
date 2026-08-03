import { describe, expect, it } from 'vitest'
import { DomainError } from '../src/errors'
import { createAuditEntry, requiresSignOff } from '../src/audit'
import { defaultConfig } from '../src/config'

describe('requiresSignOff', () => {
  it('requires sign-off at exactly the limit (inclusive boundary)', () => {
    expect(requiresSignOff(defaultConfig.signoffLimitPaise, defaultConfig.signoffLimitPaise)).toBe(true)
  })

  it('requires sign-off above the limit', () => {
    expect(requiresSignOff(defaultConfig.signoffLimitPaise + 1, defaultConfig.signoffLimitPaise)).toBe(true)
  })

  it('does not require sign-off below the limit', () => {
    expect(requiresSignOff(defaultConfig.signoffLimitPaise - 1, defaultConfig.signoffLimitPaise)).toBe(false)
  })
})

describe('createAuditEntry', () => {
  it('creates a durable entry with id and timestamp for a money move', () => {
    const entry = createAuditEntry({
      action: 'refund.issued',
      actorId: 'vol_1',
      caseId: 'case_1',
      amountPaise: 20_000,
      reason: 'Campaign expired below threshold',
    })
    expect(entry.id).toBeTruthy()
    expect(entry.createdAt).toBeInstanceOf(Date)
    expect(entry.action).toBe('refund.issued')
    expect(entry.amountPaise).toBe(20_000)
  })

  it('allows a system-triggered action (no actor) as long as a reason is given', () => {
    const entry = createAuditEntry({
      action: 'case.expired',
      actorId: null,
      caseId: 'case_1',
      reason: 'Deadline passed with goal unmet',
    })
    expect(entry.actorId).toBeNull()
  })

  it('rejects a money move without a reason', () => {
    expect(() =>
      createAuditEntry({ action: 'refund.issued', actorId: 'vol_1', amountPaise: 1_000, reason: '' }),
    ).toThrow(DomainError)
  })

  it('rejects an empty action', () => {
    expect(() => createAuditEntry({ action: '', reason: 'because' })).toThrow(DomainError)
  })

  it('rejects a negative or fractional amount', () => {
    expect(() => createAuditEntry({ action: 'refund.issued', amountPaise: -100, reason: 'r' })).toThrow(DomainError)
    expect(() => createAuditEntry({ action: 'refund.issued', amountPaise: 100.5, reason: 'r' })).toThrow(DomainError)
  })
})
