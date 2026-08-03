import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { DomainError } from '@pil/domain'
import { getTestDb, resetDb } from '@pil/testkit'
import { registerUser, setRole, verifyCredentials } from '../src/services/auth'

let db: PrismaClient

beforeAll(() => {
  db = getTestDb()
})

beforeEach(async () => {
  await resetDb(db)
})

afterAll(async () => {
  await db.$disconnect()
})

describe('registerUser', () => {
  it('registers a user with a hashed password, never stored in plaintext', async () => {
    const user = await registerUser(db, { email: 'asha@example.com', password: 'long-enough-pass', name: 'Asha' })
    expect(user.role).toBe('PUBLIC')
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(stored.passwordHash).not.toBe('long-enough-pass')
    expect(stored.passwordHash).toMatch(/^\$2/)
  })

  it('rejects invalid emails, short passwords, and duplicate emails', async () => {
    await expect(registerUser(db, { email: 'nope', password: 'long-enough-pass' })).rejects.toThrow(DomainError)
    await expect(registerUser(db, { email: 'a@b.com', password: 'short' })).rejects.toThrow(DomainError)
    await registerUser(db, { email: 'a@b.com', password: 'long-enough-pass' })
    await expect(registerUser(db, { email: 'a@b.com', password: 'long-enough-pass' })).rejects.toThrow(DomainError)
  })
})

describe('verifyCredentials', () => {
  it('verifies the correct password and rejects wrong ones', async () => {
    await registerUser(db, { email: 'v@example.com', password: 'correct-horse' })
    const ok = await verifyCredentials(db, 'v@example.com', 'correct-horse')
    expect(ok).not.toBeNull()
    expect(ok?.email).toBe('v@example.com')
    expect(await verifyCredentials(db, 'v@example.com', 'wrong')).toBeNull()
    expect(await verifyCredentials(db, 'missing@example.com', 'correct-horse')).toBeNull()
  })
})

describe('setRole', () => {
  it('promotes a user to staff and records an audit trail', async () => {
    const user = await registerUser(db, { email: 's@example.com', password: 'long-enough-pass' })
    const updated = await setRole(db, { userId: user.id, role: 'LAWYER', actorId: 'admin_1' })
    expect(updated.role).toBe('LAWYER')
    expect(await db.auditLog.count({ where: { action: 'user.role-changed' } })).toBe(1)
  })

  it('rejects unknown roles and unknown users', async () => {
    const user = await registerUser(db, { email: 'x@example.com', password: 'long-enough-pass' })
    await expect(setRole(db, { userId: user.id, role: 'SUPERUSER' as never, actorId: 'admin' })).rejects.toThrow(DomainError)
    await expect(setRole(db, { userId: 'nope', role: 'ADMIN', actorId: 'admin' })).rejects.toThrow(DomainError)
  })
})
