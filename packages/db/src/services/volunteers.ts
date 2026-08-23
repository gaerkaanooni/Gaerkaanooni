import type { Availability, Prisma, PrismaClient, Stage } from '@prisma/client'
import {
  assertDecidable,
  canAssign,
  isCategory,
  DomainError,
  isOverCapacity,
  logHours as accumulateHours,
  MAX_CAPACITY_LIMIT,
  MIN_CAPACITY_LIMIT,
  parseAvailability,
  validateLawyerApplication,
  type VolunteerAvailability,
} from '@pil/domain'
import { writeAudit } from './audit'

// ---- Lawyer applications & volunteer engagement --------------------------
//
// Public signup side (docs/spec/06-volunteers.md §5):
//   apply → staff review → approval provisions User(role LAWYER) + Volunteer
//   → the lawyer engages from /volunteer: claims cases within capacity,
//   releases them, logs pro-bono hours, and manages availability.

/** Stages where legal help can usefully be offered on a public matter. */
const ENGAGEABLE_STAGES: Stage[] = [
  'LIVE',
  'FUNDED',
  'AWAITING_FUNDS',
  'DISPATCHED',
  'ASSIGNED',
  'FILED',
  'IN_PROGRESS',
]

function toAvailability(value: string): VolunteerAvailability {
  return value.toLowerCase() as VolunteerAvailability
}

export interface SubmitLawyerApplicationInput {
  userId?: string | null
  email: string
  fullName: string
  barCouncilId: string
  yearsPractice: number
  skills: readonly string[]
  region?: string | null
  capacityLimit?: number
  motivation?: string | null
}

export type LawyerApplicationRow = Prisma.LawyerApplicationGetPayload<object>

export interface LawyerApplicationListRow {
  id: string
  email: string
  fullName: string
  barCouncilId: string
  yearsPractice: number
  skills: string[]
  region: string | null
  capacityLimit: number
  motivation: string | null
  status: string
  decisionReason: string | null
  createdAt: Date
}

function normalizeEmail(email: unknown): string {
  if (typeof email !== 'string' || !email.includes('@')) {
    throw new DomainError('A valid email is required')
  }
  return email.trim().toLowerCase()
}

/**
 * Submit (or re-submit) a lawyer application.
 *
 * Email is the application key: a PENDING or APPROVED application blocks a new
 * one; a REJECTED applicant may re-apply, which resets the same row to PENDING
 * with the fresh details.
 */
export async function submitLawyerApplication(
  db: PrismaClient,
  input: SubmitLawyerApplicationInput,
): Promise<LawyerApplicationRow> {
  const email = normalizeEmail(input.email)
  const clean = validateLawyerApplication(input)

  const existing = await db.lawyerApplication.findUnique({ where: { email } })
  if (existing && existing.status === 'APPROVED') {
    throw new DomainError('This email already belongs to an approved volunteer lawyer')
  }

  const row = await db.lawyerApplication.upsert({
    where: { email },
    update: {
      userId: input.userId ?? null,
      fullName: clean.fullName,
      barCouncilId: clean.barCouncilId,
      yearsPractice: clean.yearsPractice,
      skills: clean.skills,
      region: clean.region,
      capacityLimit: clean.capacityLimit,
      motivation: clean.motivation,
      status: 'PENDING',
      decisionReason: null,
      decidedBy: null,
      decidedAt: null,
    },
    create: {
      userId: input.userId ?? null,
      email,
      fullName: clean.fullName,
      barCouncilId: clean.barCouncilId,
      yearsPractice: clean.yearsPractice,
      skills: clean.skills,
      region: clean.region,
      capacityLimit: clean.capacityLimit,
      motivation: clean.motivation,
    },
  })

  await writeAudit(db, {
    action: 'volunteer.applied',
    actorId: input.userId ?? null,
    reason: `Lawyer application submitted by ${clean.fullName} <${email}>`,
    meta: { applicationId: row.id, resubmitted: Boolean(existing), skills: clean.skills },
  })
  return row
}

export async function listLawyerApplications(
  db: PrismaClient,
  options: { status?: 'PENDING' | 'APPROVED' | 'REJECTED' } = {},
): Promise<LawyerApplicationListRow[]> {
  const rows = await db.lawyerApplication.findMany({
    where: options.status ? { status: options.status } : undefined,
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    fullName: r.fullName,
    barCouncilId: r.barCouncilId,
    yearsPractice: r.yearsPractice,
    skills: r.skills,
    region: r.region,
    capacityLimit: r.capacityLimit,
    motivation: r.motivation,
    status: r.status,
    decisionReason: r.decisionReason,
    createdAt: r.createdAt,
  }))
}

export async function getLawyerApplicationByEmail(
  db: PrismaClient,
  email: unknown,
): Promise<LawyerApplicationRow | null> {
  const normalized = normalizeEmail(email)
  return db.lawyerApplication.findUnique({ where: { email: normalized } })
}

export interface DecideLawyerApplicationInput {
  applicationId: string
  decision: 'approved' | 'rejected'
  actorId: string
  reason: string
}

/**
 * Staff decision on an application. Approval provisions the volunteer:
 * a `User` row (role LAWYER unless the email already holds a higher staff
 * role, which we never downgrade) plus their `Volunteer` panel row.
 */
export async function decideLawyerApplication(db: PrismaClient, input: DecideLawyerApplicationInput) {
  if (!input.reason.trim()) throw new DomainError('A decision reason is required')
  if (input.decision !== 'approved' && input.decision !== 'rejected') {
    throw new DomainError('Decision must be approved or rejected')
  }

  const app = await db.lawyerApplication.findUnique({ where: { id: input.applicationId } })
  if (!app) throw new DomainError('Application not found')
  assertDecidable(app.status)

  const { application: updated, volunteerId } = await db.$transaction(async (tx) => {
    const updatedRow = await tx.lawyerApplication.update({
      where: { id: app.id },
      data: {
        status: input.decision === 'approved' ? 'APPROVED' : 'REJECTED',
        decisionReason: input.reason.trim(),
        decidedBy: input.actorId,
        decidedAt: new Date(),
      },
    })

    let volunteerId: string | null = null
    if (input.decision === 'approved') {
      const existingUser = await tx.user.findUnique({ where: { email: app.email } })
      // Never downgrade an existing higher staff role (ADMIN/INTERN stay).
      const keepStaffRole = !!existingUser && (existingUser.role === 'ADMIN' || existingUser.role === 'INTERN')
      const user =
        existingUser && keepStaffRole
          ? existingUser
          : await tx.user.upsert({
              where: { email: app.email },
              update: { role: 'LAWYER', name: existingUser?.name ?? app.fullName },
              create: { email: app.email, name: app.fullName, role: 'LAWYER' },
            })
      const volunteer = await tx.volunteer.upsert({
        where: { userId: user.id },
        update: {
          role: 'LAWYER',
          skills: app.skills,
          region: app.region,
          capacityLimit: app.capacityLimit,
        },
        create: {
          userId: user.id,
          role: 'LAWYER',
          skills: app.skills,
          region: app.region,
          capacityLimit: app.capacityLimit,
        },
      })
      volunteerId = volunteer.id
    }

    return { application: updatedRow, volunteerId }
  })

  // Audit after commit, matching the repo convention (services/contributions.ts).
  await writeAudit(db, {
    action:
      input.decision === 'approved'
        ? 'volunteer.application-approved'
        : 'volunteer.application-rejected',
    actorId: input.actorId,
    reason: input.reason.trim(),
    meta: { applicationId: app.id, email: app.email, volunteerId },
  })

  return { application: updated, volunteerId }
}

// ---- Engagement -----------------------------------------------------------

export interface VolunteerProfile {
  volunteerId: string
  name: string | null
  email: string
  role: string
  availability: string
  region: string | null
  capacityLimit: number
  activeCaseCount: number
  hoursContributed: number
  overCapacity: boolean
  assignable: boolean
}

type VolunteerWithLoad = Prisma.VolunteerGetPayload<{
  include: { user: true; assignments: { where: { status: 'ACTIVE' }; select: { id: true } } }
}>

/** Resolve the volunteer panel member behind a public session email, if approved. */
export async function getVolunteerForEmail(
  db: PrismaClient,
  email: unknown,
): Promise<{ profile: VolunteerProfile; record: VolunteerWithLoad } | null> {
  const normalized = normalizeEmail(email)
  const record = await db.volunteer.findFirst({
    where: { user: { email: normalized } },
    include: {
      user: true,
      assignments: { where: { status: 'ACTIVE' }, select: { id: true } },
    },
  })
  if (!record) return null
  const activeCaseCount = record.assignments.length
  const availability = toAvailability(record.availability)
  return {
    record,
    profile: {
      volunteerId: record.id,
      name: record.user.name,
      email: record.user.email,
      role: record.role,
      availability,
      region: record.region,
      capacityLimit: record.capacityLimit,
      activeCaseCount,
      hoursContributed: record.hoursContributed,
      overCapacity: isOverCapacity(activeCaseCount, record.capacityLimit),
      assignable: canAssign({
        availability,
        activeCaseCount,
        capacityLimit: record.capacityLimit,
      }),
    },
  }
}

export interface OpenCaseRow {
  id: string
  title: string
  summary: string
  category: string
  region: string | null
  stage: string
  entryType: string
  activeVolunteers: number
  mine: boolean
}

export interface MyAssignmentRow {
  assignmentId: string
  caseId: string
  caseTitle: string
  caseRegion: string | null
  caseStage: string
  kind: string
  assignedAt: Date
}

export interface EngagementBoard {
  openCases: OpenCaseRow[]
  myAssignments: MyAssignmentRow[]
}

/**
 * The lawyer's engagement board: published matters that can still use help,
 * with this volunteer's own commitments separated out.
 */
export async function getEngagementBoard(
  db: PrismaClient,
  volunteerId: string,
): Promise<EngagementBoard> {
  const cases = await db.case.findMany({
    where: { publishedAt: { not: null }, stage: { in: ENGAGEABLE_STAGES } },
    orderBy: [{ publishedAt: 'desc' }],
    include: {
      assignments: {
        where: { status: 'ACTIVE' },
        select: { volunteerId: true },
      },
    },
  })

  const openCases: OpenCaseRow[] = cases.map((c) => ({
    id: c.id,
    title: c.title,
    summary: c.summary,
    category: c.category,
    region: c.region,
    stage: c.stage,
    entryType: c.entryType,
    activeVolunteers: c.assignments.length,
    mine: c.assignments.some((a) => a.volunteerId === volunteerId),
  }))

  const mine = await db.assignment.findMany({
    where: { volunteerId, status: 'ACTIVE' },
    orderBy: { assignedAt: 'desc' },
    include: { case: { select: { id: true, title: true, region: true, stage: true } } },
  })

  return {
    openCases,
    myAssignments: mine.map((a) => ({
      assignmentId: a.id,
      caseId: a.case.id,
      caseTitle: a.case.title,
      caseRegion: a.case.region,
      caseStage: a.case.stage,
      kind: a.kind,
      assignedAt: a.assignedAt,
    })),
  }
}

export interface ClaimCaseInput {
  volunteerId: string
  caseId: string
  /** Self-service claims join as SUPPORT; PRIMARY stays a coordinator decision. */
  kind?: 'SUPPORT'
  actorId?: string | null
}

/**
 * Offer help on a case. Enforces the domain rules end-to-end: the volunteer
 * must be AVAILABLE and under capacity, the case must still be engageable,
 * and (caseId, volunteerId) stays unique — a released pairing is re-activated.
 */
export async function claimCaseForVolunteer(db: PrismaClient, input: ClaimCaseInput) {
  const volunteer = await db.volunteer.findUnique({
    where: { id: input.volunteerId },
    include: { user: { select: { email: true } }, assignments: { where: { status: 'ACTIVE' }, select: { id: true } } },
  })
  if (!volunteer) throw new DomainError('Volunteer not found')

  const activeCount = volunteer.assignments.length
  const assignable = canAssign({
    availability: toAvailability(volunteer.availability),
    activeCaseCount: activeCount,
    capacityLimit: volunteer.capacityLimit,
  })
  if (!assignable) {
    throw new DomainError(
      volunteer.availability === 'AVAILABLE'
        ? 'You are at your concurrent case limit — release a case or raise your limit first'
        : 'Set your availability back to “available” before taking on a case',
    )
  }

  const caseRec = await db.case.findUnique({
    where: { id: input.caseId },
    include: { assignments: { where: { status: 'ACTIVE' }, select: { volunteerId: true } } },
  })
  if (!caseRec) throw new DomainError('Case not found')
  if (!caseRec.publishedAt || !ENGAGEABLE_STAGES.includes(caseRec.stage)) {
    throw new DomainError('This case is not open for volunteers right now')
  }
  if (caseRec.assignments.some((a) => a.volunteerId === volunteer.id)) {
    throw new DomainError('You are already helping on this case')
  }

  const assignment = await db.assignment.upsert({
    where: { caseId_volunteerId: { caseId: input.caseId, volunteerId: volunteer.id } },
    update: { status: 'ACTIVE', kind: input.kind ?? 'SUPPORT', assignedAt: new Date() },
    create: {
      caseId: input.caseId,
      volunteerId: volunteer.id,
      kind: input.kind ?? 'SUPPORT',
    },
  })

  await writeAudit(db, {
    action: 'volunteer.assignment-claimed',
    actorId: input.actorId ?? volunteer.userId,
    caseId: caseRec.id,
    reason: `${volunteer.user.email} volunteered for “${caseRec.title}”`,
    meta: { assignmentId: assignment.id, kind: assignment.kind, activeCountAfter: activeCount + 1 },
  })
  return assignment
}

export async function releaseAssignment(
  db: PrismaClient,
  input: { volunteerId: string; assignmentId: string },
) {
  const assignment = await db.assignment.findUnique({
    where: { id: input.assignmentId },
    include: { case: { select: { id: true, title: true } } },
  })
  if (!assignment) throw new DomainError('Assignment not found')
  if (assignment.volunteerId !== input.volunteerId) throw new DomainError('Not your assignment')
  if (assignment.status !== 'ACTIVE') throw new DomainError('Assignment is already released')

  const released = await db.assignment.update({
    where: { id: assignment.id },
    data: { status: 'RELEASED' },
  })

  await writeAudit(db, {
    action: 'volunteer.assignment-released',
    caseId: assignment.caseId,
    reason: `Released “${assignment.case.title}”`,
    meta: { assignmentId: assignment.id },
  })
  return released
}

/** Log pro-bono hours against the volunteer's certificate total. Integer hours only. */
export async function logVolunteerHours(
  db: PrismaClient,
  input: { volunteerId: string; hours: number; note?: string | null },
) {
  const volunteer = await db.volunteer.findUniqueOrThrow({ where: { id: input.volunteerId } })
  const next = accumulateHours(volunteer.hoursContributed, input.hours)
  await db.volunteer.update({ where: { id: volunteer.id }, data: { hoursContributed: next } })
  await writeAudit(db, {
    action: 'volunteer.hours-logged',
    reason: input.note?.trim() || `Logged ${input.hours} pro-bono hour(s)`,
    meta: { volunteerId: volunteer.id, hours: input.hours, totalAfter: next },
  })
  return next
}

export interface UpdateVolunteerPreferencesInput {
  volunteerId: string
  availability?: unknown
  capacityLimit?: unknown
  region?: unknown
  skills?: unknown
}

/** Update availability / capacity / region / skills from self-service input. */
export async function updateVolunteerPreferences(db: PrismaClient, input: UpdateVolunteerPreferencesInput) {
  const volunteer = await db.volunteer.findUniqueOrThrow({ where: { id: input.volunteerId } })
  const data: Prisma.VolunteerUncheckedUpdateInput = {}

  if (input.availability !== undefined) {
    const availability = parseAvailability(input.availability)
    if (!availability) throw new DomainError('Availability must be available, busy or away')
    data.availability = availability.toUpperCase() as Availability
  }

  if (input.capacityLimit !== undefined) {
    const limit = input.capacityLimit
    if (
      !Number.isInteger(limit) ||
      (limit as number) < MIN_CAPACITY_LIMIT ||
      (limit as number) > MAX_CAPACITY_LIMIT
    ) {
      throw new DomainError(
        `Concurrent case limit must be between ${MIN_CAPACITY_LIMIT} and ${MAX_CAPACITY_LIMIT}`,
      )
    }
    data.capacityLimit = limit as number
  }

  if (input.region !== undefined) {
    data.region =
      typeof input.region === 'string' && input.region.trim() ? input.region.trim().slice(0, 80) : null
  }

  if (input.skills !== undefined) {
    if (!Array.isArray(input.skills) || input.skills.length === 0) {
      throw new DomainError('Pick at least one area of practice')
    }
    const skills: string[] = []
    for (const raw of input.skills) {
      const skill = String(raw)
      if (!isCategory(skill)) throw new DomainError(`Unknown area of practice: ${skill}`)
      if (!skills.includes(skill)) skills.push(skill)
    }
    data.skills = skills
  }

  const updated = await db.volunteer.update({ where: { id: volunteer.id }, data })
  await writeAudit(db, {
    action: 'volunteer.preferences-updated',
    reason: 'Volunteer updated their engagement preferences',
    meta: { volunteerId: volunteer.id, changed: Object.keys(data) },
  })
  return updated
}
