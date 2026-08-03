import type { PrismaClient } from '@prisma/client'
import { DomainError } from '@pil/domain'
import { writeAudit } from './audit'

export interface PostCaseUpdateInput {
  caseId: string
  authorId?: string | null
  title: string
  body: string
  published?: boolean
}

export async function postCaseUpdate(db: PrismaClient, input: PostCaseUpdateInput) {
  if (typeof input.title !== 'string' || input.title.trim().length === 0) {
    throw new DomainError('Update title is required')
  }
  if (typeof input.body !== 'string' || input.body.trim().length === 0) {
    throw new DomainError('Update body is required')
  }
  const caseRec = await db.case.findUnique({ where: { id: input.caseId } })
  if (!caseRec) throw new DomainError('Case not found')
  if (!caseRec.publishedAt) {
    throw new DomainError('Only cases that have gone live accept updates')
  }

  const created = await db.caseUpdate.create({
    data: {
      caseId: input.caseId,
      authorId: input.authorId,
      title: input.title.trim(),
      body: input.body.trim(),
      published: input.published ?? true,
    },
  })
  await writeAudit(db, {
    action: 'case.update.posted',
    actorId: input.authorId,
    caseId: input.caseId,
    reason: `Public update posted: ${created.title}`,
  })
  return created
}
