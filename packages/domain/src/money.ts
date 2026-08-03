import type { PlatformConfig } from './config'
import { DomainError } from './errors'

export interface ContributionSplit {
  grossAmountPaise: number
  totalFeePaise: number
  gatewayFeePaise: number
  platformFeePaise: number
  netToCasePaise: number
}

export function toPaise(rupees: string): number {
  const match = /^\d+(\.\d{1,2})?$/.exec(rupees.trim())
  if (!match) {
    throw new DomainError(`Invalid rupee amount: "${rupees}"`)
  }
  const [whole, frac = ''] = match[0].split('.')
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'))
}

export function assertIntegerPaise(amount: number): void {
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 0) {
    throw new DomainError(`Amount must be a non-negative integer of paise, got ${amount}`)
  }
}

export function isBackAmountValid(amountPaise: number): boolean {
  return Number.isInteger(amountPaise) && amountPaise > 0
}

/**
 * Splits a backer's gross contribution at `config.platformFeePercent` (inclusive of the payment
 * gateway fee). The case always nets `gross - totalFee`; the gateway takes its actual cut, the
 * platform keeps the difference. All values are integer paise.
 */
export function computeContributionSplit(
  grossAmountPaise: number,
  gatewayFeePaise: number,
  config: PlatformConfig,
): ContributionSplit {
  assertIntegerPaise(grossAmountPaise)
  assertIntegerPaise(gatewayFeePaise)

  const totalFeePaise = Math.floor((grossAmountPaise * config.platformFeePercent) / 100)
  const platformFeePaise = totalFeePaise - gatewayFeePaise
  if (platformFeePaise < 0) {
    throw new DomainError(
      `Gateway fee ${gatewayFeePaise} exceeds total fee ${totalFeePaise} for gross ${grossAmountPaise}`,
    )
  }

  return {
    grossAmountPaise,
    totalFeePaise,
    gatewayFeePaise,
    platformFeePaise,
    netToCasePaise: grossAmountPaise - totalFeePaise,
  }
}

export function isThresholdMet(capturedNetPaise: number, goalPaise: number): boolean {
  assertIntegerPaise(capturedNetPaise)
  assertIntegerPaise(goalPaise)
  if (goalPaise === 0) {
    throw new DomainError('A campaign goal must be positive')
  }
  return capturedNetPaise >= goalPaise
}
