import { Prisma, type PrismaClient } from '@prisma/client'
import { createAuditEntry, type AuditEntry } from '@pil/domain'

export async function writeAudit(db: PrismaClient, input: Parameters<typeof createAuditEntry>[0]) {
  await db.auditLog.create({ data: toDbAudit(createAuditEntry(input)) })
}

export function toDbAudit(entry: AuditEntry): Prisma.AuditLogUncheckedCreateInput {
  return {
    id: entry.id,
    action: entry.action,
    actorId: entry.actorId,
    caseId: entry.caseId,
    amountPaise: entry.amountPaise,
    reason: entry.reason,
    meta: entry.meta == null ? undefined : (entry.meta as unknown as Prisma.InputJsonValue),
    createdAt: entry.createdAt,
  }
}
