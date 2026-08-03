import type { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { DomainError, type Role } from '@pil/domain'
import { writeAudit } from './audit'

const ROUNDS = 10
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface RegisterUserInput {
  email: string
  password: string
  name?: string | null
  role?: Role
}

export async function registerUser(db: PrismaClient, input: RegisterUserInput) {
  if (!EMAIL_RE.test(input.email.trim())) {
    throw new DomainError('A valid email is required')
  }
  if (typeof input.password !== 'string' || input.password.length < 8) {
    throw new DomainError('Password must be at least 8 characters')
  }
  const existing = await db.user.findUnique({ where: { email: input.email.trim() } })
  if (existing) throw new DomainError('An account with this email already exists')

  const passwordHash = await bcrypt.hash(input.password, ROUNDS)
  return db.user.create({
    data: {
      email: input.email.trim(),
      name: input.name?.trim() || null,
      passwordHash,
      role: input.role ?? 'PUBLIC',
    },
  })
}

export async function verifyCredentials(
  db: PrismaClient,
  email: string,
  password: string,
) {
  const user = await db.user.findUnique({ where: { email: email.trim() } })
  if (!user || !user.passwordHash) return null
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return null
  return user
}

export async function setRole(db: PrismaClient, input: { userId: string; role: Role; actorId: string }) {
  if (input.role !== 'ADMIN' && input.role !== 'INTERN' && input.role !== 'LAWYER' && input.role !== 'BACKER' && input.role !== 'PUBLIC') {
    throw new DomainError(`Invalid role: ${input.role}`)
  }
  const user = await db.user.findUnique({ where: { id: input.userId } })
  if (!user) throw new DomainError('User not found')

  const updated = await db.user.update({
    where: { id: input.userId },
    data: { role: input.role },
  })
  await writeAudit(db, {
    action: 'user.role-changed',
    actorId: input.actorId,
    caseId: null,
    reason: `Role changed for ${user.email} to ${input.role}`,
  })
  return updated
}
