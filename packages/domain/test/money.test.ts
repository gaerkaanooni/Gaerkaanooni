import { describe, expect, it } from 'vitest'
import { DomainError } from '../src/errors'
import {
  assertIntegerPaise,
  computeContributionSplit,
  isBackAmountValid,
  isThresholdMet,
  toPaise,
} from '../src/money'
import { defaultConfig } from '../src/config'

describe('toPaise', () => {
  it('converts rupees to integer paise', () => {
    expect(toPaise('200')).toBe(20_000)
    expect(toPaise('200.50')).toBe(20_050)
    expect(toPaise('0.05')).toBe(5)
  })

  it('rejects non-numeric input', () => {
    expect(() => toPaise('abc')).toThrow(DomainError)
    expect(() => toPaise('')).toThrow(DomainError)
  })
})

describe('assertIntegerPaise', () => {
  it('rejects fractional amounts', () => {
    expect(() => assertIntegerPaise(200.5)).toThrow(DomainError)
  })

  it('rejects negatives and non-finite values', () => {
    expect(() => assertIntegerPaise(-5)).toThrow(DomainError)
    expect(() => assertIntegerPaise(Number.NaN)).toThrow(DomainError)
  })

  it('accepts positive integers', () => {
    expect(() => assertIntegerPaise(200)).not.toThrow()
  })
})

describe('isBackAmountValid', () => {
  it('accepts a positive integer back amount', () => {
    expect(isBackAmountValid(200)).toBe(true)
    expect(isBackAmountValid(1)).toBe(true)
  })

  it('rejects zero, negative, and fractional amounts', () => {
    expect(isBackAmountValid(0)).toBe(false)
    expect(isBackAmountValid(-200)).toBe(false)
    expect(isBackAmountValid(2.5)).toBe(false)
  })
})

describe('computeContributionSplit (5% fee inclusive of gateway)', () => {
  it('splits a ₹200 contribution at 5% total fee with a 2% gateway', () => {
    const split = computeContributionSplit(20_000, 400, defaultConfig)
    expect(split.totalFeePaise).toBe(1_000) // 5% of 20,000
    expect(split.gatewayFeePaise).toBe(400)
    expect(split.platformFeePaise).toBe(600) // 5% − 2%
    expect(split.netToCasePaise).toBe(19_000) // 95% of gross
    expect(split.netToCasePaise + split.totalFeePaise).toBe(split.grossAmountPaise)
  })

  it('always nets the full case amount and total fee to the gross', () => {
    for (const gross of [1, 99, 100, 10_000, 200_000]) {
      const split = computeContributionSplit(gross, 0, defaultConfig)
      expect(split.netToCasePaise + split.totalFeePaise).toBe(gross)
      expect(split.netToCasePaise).toBe(gross - Math.floor((gross * 5) / 100))
    }
  })

  it('floors the total fee for sub-5-paise contributions rather than rounding up', () => {
    const split = computeContributionSplit(1, 0, defaultConfig)
    expect(split.totalFeePaise).toBe(0)
    expect(split.netToCasePaise).toBe(1)
  })

  it('rejects non-integer or negative gross amounts', () => {
    expect(() => computeContributionSplit(200.5, 0, defaultConfig)).toThrow(DomainError)
    expect(() => computeContributionSplit(-200, 0, defaultConfig)).toThrow(DomainError)
  })

  it('rejects a gateway fee that exceeds the total fee', () => {
    expect(() => computeContributionSplit(1_000, 60, defaultConfig)).toThrow(DomainError)
  })
})

describe('isThresholdMet', () => {
  it('treats captured net equal to the goal as met (exact boundary)', () => {
    expect(isThresholdMet(19_000, 19_000)).toBe(true)
  })

  it('treats captured net one paise short as unmet', () => {
    expect(isThresholdMet(18_999, 19_000)).toBe(false)
  })

  it('treats captured net above the goal as met', () => {
    expect(isThresholdMet(20_000, 19_000)).toBe(true)
  })

  it('rejects a non-positive goal', () => {
    expect(() => isThresholdMet(100, 0)).toThrow(DomainError)
    expect(() => isThresholdMet(100, -100)).toThrow(DomainError)
  })
})
