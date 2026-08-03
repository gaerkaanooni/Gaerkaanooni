export interface PlatformConfig {
  /** Required check-in cadence (days) once a case is active. Founder call, set at deploy. */
  cadenceDays: number
  /** Total fee charged on successfully funded campaigns, inclusive of the payment gateway fee. */
  platformFeePercent: number
  /** Share of net-of-fee surplus (contributions beyond goal) swept to the response fund. */
  surplusToFundPercent: number
  /** Money moves at or above this amount (integer paise) require a second-approval sign-off. */
  signoffLimitPaise: number
  /** Dispatch budget used when a verified urgent submission has no budget set yet. */
  defaultDispatchBudgetPaise: number
}

export const defaultConfig: PlatformConfig = {
  cadenceDays: 7,
  platformFeePercent: 5,
  surplusToFundPercent: 25,
  signoffLimitPaise: 25_000 * 100, // ₹25,000
  defaultDispatchBudgetPaise: 50_000 * 100, // ₹50,000
}
