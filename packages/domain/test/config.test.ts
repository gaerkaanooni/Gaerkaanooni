import { describe, expect, it } from 'vitest'
import { defaultConfig } from '../src/config'

describe('defaultConfig', () => {
  it('keeps the platform fee a positive percentage below 100', () => {
    expect(defaultConfig.platformFeePercent).toBeGreaterThan(0)
    expect(defaultConfig.platformFeePercent).toBeLessThan(100)
  })

  it('expresses the signoff limit in integer paise', () => {
    expect(Number.isInteger(defaultConfig.signoffLimitPaise)).toBe(true)
    expect(defaultConfig.signoffLimitPaise).toBeGreaterThan(0)
  })

  it('keeps the response-fund surplus share within (0, 100)%', () => {
    expect(defaultConfig.surplusToFundPercent).toBeGreaterThan(0)
    expect(defaultConfig.surplusToFundPercent).toBeLessThan(100)
  })

  it('uses a positive update cadence in days', () => {
    expect(defaultConfig.cadenceDays).toBeGreaterThan(0)
  })

  it('sets a positive default dispatch budget', () => {
    expect(defaultConfig.defaultDispatchBudgetPaise).toBeGreaterThan(0)
  })
})
