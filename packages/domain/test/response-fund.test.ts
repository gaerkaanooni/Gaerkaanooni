import { describe, expect, it } from 'vitest'
import { defaultConfig } from '../src/config'
import { DomainError } from '../src/errors'
import {
  canDispatch,
  computeSurplusSweep,
  drawFromFund,
  InsufficientFundsError,
  replenishFund,
} from '../src/response-fund'

describe('drawFromFund', () => {
  it('draws exactly the dispatch cost and reduces the balance', () => {
    const { newBalancePaise, dispatchCostPaise } = drawFromFund(50_000, 20_000)
    expect(dispatchCostPaise).toBe(20_000)
    expect(newBalancePaise).toBe(30_000)
  })

  it('allows a draw that empties the balance to zero', () => {
    const { newBalancePaise } = drawFromFund(20_000, 20_000)
    expect(newBalancePaise).toBe(0)
  })

  it('throws InsufficientFundsError when the draw exceeds the balance', () => {
    expect(() => drawFromFund(0, 20_000)).toThrow(InsufficientFundsError)
    expect(() => drawFromFund(19_999, 20_000)).toThrow(InsufficientFundsError)
  })

  it('rejects non-positive or non-integer draw amounts', () => {
    expect(() => drawFromFund(50_000, 0)).toThrow(DomainError)
    expect(() => drawFromFund(50_000, -100)).toThrow(DomainError)
    expect(() => drawFromFund(50_000, 100.5)).toThrow(DomainError)
  })
})

describe('canDispatch', () => {
  it('is false on an unseeded (zero) fund for any positive cost', () => {
    expect(canDispatch(0, 20_000)).toBe(false)
  })

  it('is true exactly at and above the required balance', () => {
    expect(canDispatch(20_000, 20_000)).toBe(true)
    expect(canDispatch(25_000, 20_000)).toBe(true)
    expect(canDispatch(19_999, 20_000)).toBe(false)
  })
})

describe('replenishFund', () => {
  it('increases the balance by the replenishment amount', () => {
    expect(replenishFund(0, 100_000)).toBe(100_000)
    expect(replenishFund(100_000, 25_000)).toBe(125_000)
  })

  it('rejects non-positive replenishments', () => {
    expect(() => replenishFund(100_000, 0)).toThrow(DomainError)
    expect(() => replenishFund(100_000, -1)).toThrow(DomainError)
  })
})

describe('computeSurplusSweep (25% to response fund, case keeps 75%)', () => {
  it('sweeps a quarter of the surplus to the fund and keeps the rest on the case', () => {
    const result = computeSurplusSweep(190_000, 100_000, defaultConfig)
    expect(result.surplusPaise).toBe(90_000)
    expect(result.sweepToFundPaise).toBe(22_500)
    expect(result.keptByCasePaise).toBe(67_500)
    expect(result.sweepToFundPaise + result.keptByCasePaise).toBe(result.surplusPaise)
  })

  it('produces a zero sweep at exactly the goal', () => {
    const result = computeSurplusSweep(100_000, 100_000, defaultConfig)
    expect(result.surplusPaise).toBe(0)
    expect(result.sweepToFundPaise).toBe(0)
    expect(result.keptByCasePaise).toBe(0)
  })

  it('floors the sweep on sub-paise fractions so the case keeps the remainder', () => {
    const result = computeSurplusSweep(101, 100, defaultConfig)
    expect(result.surplusPaise).toBe(1)
    expect(result.sweepToFundPaise).toBe(0)
    expect(result.keptByCasePaise).toBe(1)
  })

  it('throws when the campaign is still below its goal', () => {
    expect(() => computeSurplusSweep(99_000, 100_000, defaultConfig)).toThrow(DomainError)
  })
})
