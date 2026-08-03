import { assertIntegerPaise } from './money'
import { DomainError } from './errors'

export interface AuditEntryInput {
  action: string
  actorId?: string | null
  caseId?: string | null
  amountPaise?: number | null
  reason: string
  meta?: Record<string, unknown>
  createdAt?: Date
}

export interface AuditEntry {
  id: string
  action: string
  actorId: string | null
  caseId: string | null
  amountPaise: number | null
  reason: string
  meta: Record<string, unknown> | null
  createdAt: Date
}

let seq = 0
function nextId(): string {
  seq = (seq + 1) % 0xffffff
  return `aud_${Date.now().toString(36)}_${seq.toString(36)}`
}

export function requiresSignOff(amountPaise: number, signoffLimitPaise: number): boolean {
  assertIntegerPaise(amountPaise)
  assertIntegerPaise(signoffLimitPaise)
  return amountPaise >= signoffLimitPaise
}

/**
 * Creates a durable audit entry. Every action that moves money must produce one; a `reason` is
 * mandatory so the trail always answers "why".
 */
export function createAuditEntry(input: AuditEntryInput): AuditEntry {
  if (input.action.trim().length === 0) {
    throw new DomainError('An audit action is required')
  }
  if (input.reason.trim().length === 0) {
    throw new DomainError('An audit reason is required for every action')
  }
  if (input.amountPaise != null) {
    assertIntegerPaise(input.amountPaise)
  }
  return {
    id: nextId(),
    action: input.action,
    actorId: input.actorId ?? null,
    caseId: input.caseId ?? null,
    amountPaise: input.amountPaise ?? null,
    reason: input.reason,
    meta: input.meta ?? null,
    createdAt: input.createdAt ?? new Date(),
  }
}
