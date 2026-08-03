export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DomainError'
  }
}

export class InvalidTransitionError extends DomainError {
  constructor(entryType: string, from: string, to: string) {
    super(`Invalid transition: ${entryType} ${from} -> ${to}`)
    this.name = 'InvalidTransitionError'
  }
}

export class InsufficientFundsError extends DomainError {
  constructor(balancePaise: number, requestedPaise: number) {
    super(`Insufficient response fund balance: need ${requestedPaise}, have ${balancePaise}`)
    this.name = 'InsufficientFundsError'
  }
}
