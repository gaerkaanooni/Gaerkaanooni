import type { PrismaClient } from '@prisma/client'
import type { CaseStage, CategoryName, EntryType } from '@pil/domain'

const ENTRY_TYPE_TO_DB = { funded: 'FUNDED', dispatched: 'DISPATCHED' } as const

export function toDbEntryType(entryType: EntryType): 'FUNDED' | 'DISPATCHED' {
  return ENTRY_TYPE_TO_DB[entryType]
}

export function toDbStage(stage: CaseStage): CaseStage {
  return stage
}

export interface CreateSubmissionInput {
  entryType: EntryType
  title: string
  summary: string
  description?: string | null
  category: CategoryName
  region?: string | null
  goalAmountPaise: number
  deadlineAt?: Date | null
  track: 'CAMPAIGN' | 'RESPONSE'
  whatHappened: string
  where?: string | null
  when?: string | null
  applicantName?: string | null
  contact?: string | null
  onBehalfOf?: string | null
  isAnonymous?: boolean
}

export class CaseRepository {
  constructor(private db: PrismaClient) {}

  async createSubmission(input: CreateSubmissionInput) {
    return this.db.$transaction(async (tx) => {
      const caseRec = await tx.case.create({
        data: {
          entryType: toDbEntryType(input.entryType),
          title: input.title,
          summary: input.summary,
          description: input.description,
          category: input.category,
          region: input.region,
          stage: 'SUBMITTED',
          goalAmountPaise: input.goalAmountPaise,
          deadlineAt: input.deadlineAt,
        },
      })
      await tx.submission.create({
        data: {
          caseId: caseRec.id,
          track: input.track,
          whatHappened: input.whatHappened,
          where: input.where,
          when: input.when,
          applicantName: input.applicantName,
          contact: input.contact,
          onBehalfOf: input.onBehalfOf,
          isAnonymous: input.isAnonymous ?? false,
        },
      })
      return caseRec
    })
  }

  async getById(id: string) {
    return this.db.case.findUnique({
      where: { id },
      include: { submission: true, screening: true },
    })
  }

  async updateStage(id: string, stage: CaseStage) {
    return this.db.case.update({
      where: { id },
      data: { stage: toDbStage(stage) },
    })
  }

  async listByStage(stage: CaseStage) {
    return this.db.case.findMany({ where: { stage: toDbStage(stage) }, orderBy: { createdAt: 'desc' } })
  }
}
