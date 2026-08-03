import { DomainError } from './errors'

export type Role = 'ADMIN' | 'INTERN' | 'LAWYER' | 'BACKER' | 'PUBLIC'

export type Action =
  | 'case.screen'
  | 'case.publish'
  | 'case.verify'
  | 'case.dispatch'
  | 'case.update'
  | 'case.refund'
  | 'case.finalize'
  | 'dashboard.view'
  | 'finance.view'
  | 'case.back'
  | 'case.follow'

export const STAFF_ROLES: readonly Role[] = ['INTERN', 'LAWYER', 'ADMIN'] as const

const ALLOWED: Readonly<Record<Action, readonly Role[]>> = {
  'case.screen': ['INTERN', 'LAWYER', 'ADMIN'],
  'case.publish': ['INTERN', 'LAWYER', 'ADMIN'],
  'case.verify': ['LAWYER', 'ADMIN'],
  'case.dispatch': ['LAWYER', 'ADMIN'],
  'case.update': ['INTERN', 'LAWYER', 'ADMIN'],
  'case.refund': ['ADMIN'],
  'case.finalize': ['ADMIN'],
  'dashboard.view': STAFF_ROLES,
  'finance.view': ['ADMIN'],
  'case.back': ['BACKER', 'PUBLIC', 'INTERN', 'LAWYER', 'ADMIN'],
  'case.follow': ['BACKER', 'PUBLIC', 'INTERN', 'LAWYER', 'ADMIN'],
}

export function canPerform(role: Role | null | undefined, action: Action): boolean {
  if (role == null) return false
  return ALLOWED[action].includes(role)
}

export function assertRole(role: Role | null | undefined, action: Action): asserts role is Role {
  if (!canPerform(role, action)) {
    throw new DomainError(`Role ${String(role ?? 'none')} cannot perform ${action}`)
  }
}
