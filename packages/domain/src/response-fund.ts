export { InsufficientFundsError } from './errors'
import type { PlatformConfig } from './config'
import { assertIntegerPaise } from './money'
import { DomainError, InsufficientFundsError } from './errors'

export interface DrawResult {
  dispatchCostPaise: number
  newBalancePaise: number
}

export function canDispatch(balancePaise: number, dispatchCostPaise: number): boolean {
  return dispatchCostPaise > 0 && balancePaise >= dispatchCostPaise
}

export function drawFromFund(balancePaise: number, dispatchCostPaise: number): DrawResult {
  assertIntegerPaise(balancePaise)
  assertIntegerPaise(dispatchCostPaise)
  if (dispatchCostPaise === 0) {
    throw new DomainError('A response dispatch cost must be positive')
  }
  if (!canDispatch(balancePaise, dispatchCostPaise)) {
    throw new InsufficientFundsError(balancePaise, dispatchCostPaise)
  }
  return {
    dispatchCostPaise,
    newBalancePaise: balancePaise - dispatchCostPaise,
  }
}

export function replenishFund(balancePaise: number, amountPaise: number): number {
  assertIntegerPaise(balancePaise)
  assertIntegerPaise(amountPaise)
  if (amountPaise === 0) {
    throw new DomainError('A replenishment amount must be positive')
  }
  return balancePaise + amountPaise
}

export interface SurplusSweep {
  surplusPaise: number
  sweepToFundPaise: number
  keptByCasePaise: number
}

/**
 * Splits a funded campaign's net-of-fee surplus. `surplusToFundPercent` flows to the response
 * fund; the case keeps the rest for ongoing litigation costs. Only valid once funded.
 */
export function computeSurplusSweep(
  totalNetPaise: number,
  goalPaise: number,
  config: PlatformConfig,
): SurplusSweep {
  assertIntegerPaise(totalNetPaise)
  assertIntegerPaise(goalPaise)
  const surplusPaise = totalNetPaise - goalPaise
  if (surplusPaise < 0) {
    throw new DomainError(`Campaign has not met its goal; no surplus to sweep (short by ${-surplusPaise})`)
  }
  const sweepToFundPaise = Math.floor((surplusPaise * config.surplusToFundPercent) / 100)
  return {
    surplusPaise,
    sweepToFundPaise,
    keptByCasePaise: surplusPaise - sweepToFundPaise,
  }
}
