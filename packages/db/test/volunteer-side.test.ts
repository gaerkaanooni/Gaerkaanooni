import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { DomainError } from '@pil/domain'
import { getTestDb, resetDb } from '@pil/testkit'
import { publishCampaign, screenCase, submitCampaign } from '../src/services/case-flows'
import {
  decideAssignmentRequest,
  decideLawyerApplication,
  getEngagementBoard,
  getLawyerApplicationByEmail,
  getVolunteerForEmail,
  listAssignmentRequests,
  listLawyerApplications,
  logVolunteerHours,
  releaseAssignment,
  requestCaseForVolunteer,
  submitLawyerApplication,
  updateVolunteerPreferences,
  withdrawAssignmentRequest,
} from '../src/services/volunteers'

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

const application = {
  email: 'advocate.rao@example.com',
  fullName: 'Asha Rao',
  barCouncilId: 'DL/1017/2015',
  yearsPractice: 9,
  skills: ['ENVIRONMENT', 'HOUSING'],
  region: 'Delhi',
  capacityLimit: 2,
}

async function provisionApprovedVolunteer(overrides: Partial<typeof application> = {}) {
  const input = { ...application, ...overrides }
  await submitLawyerApplication(db, { ...input, userId: 'pub_123' })
  return decideLawyerApplication(db, {
    applicationId: (await db.lawyerApplication.findUniqueOrThrow({ where: { email: input.email } })).id,
    decision: 'approved',
    actorId: 'admin_1',
    reason: 'Bar details verified',
  })
}

async function publishedCase(title: string) {
  const c = await submitCampaign(db, {
    entryType: 'funded',
    title,
    summary: `${title} — summary.`,
    category: 'ENVIRONMENT',
    region: 'Delhi',
    goalAmountPaise: 500_000,
    deadlineAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    track: 'CAMPAIGN',
    whatHappened: 'Continuous harm.',
    applicantName: 'Asha Rao',
    contact: 'asha@example.com',
  })
  await screenCase(db, { caseId: c.id, decidedBy: 'lawyer_1', isEligible: true, reason: 'In scope.' })
  return publishCampaign(db, { caseId: c.id, actorId: 'intern_1' })
}

describe('lawyer applications', () => {
  it('submits a PENDING application with an audit trail', async () => {
    const row = await submitLawyerApplication(db, { ...application, userId: 'pub_1' })
    expect(row.status).toBe('PENDING')
    expect(await db.auditLog.count({ where: { action: 'volunteer.applied' } })).toBe(1)
  })

  it('rejects malformed applications', async () => {
    await expect(
      submitLawyerApplication(db, { ...application, skills: [] }),
    ).rejects.toThrow(DomainError)
    await expect(
      submitLawyerApplication(db, { ...application, yearsPractice: 4.5 }),
    ).rejects.toThrow(DomainError)
    await expect(
      submitLawyerApplication(db, { ...application, capacityLimit: 99 }),
    ).rejects.toThrow(DomainError)
  })

  it('approval provisions a LAWYER user and Volunteer panel row atomically', async () => {
    const { volunteerId } = await provisionApprovedVolunteer()
    expect(volunteerId).toBeTruthy()

    const user = await db.user.findUniqueOrThrow({ where: { email: application.email } })
    expect(user.role).toBe('LAWYER')

    const volunteer = await db.volunteer.findUnique({ where: { userId: user.id } })
    expect(volunteer?.skills).toEqual(application.skills)
    expect(volunteer?.capacityLimit).toBe(application.capacityLimit)

    const resolved = await getVolunteerForEmail(db, application.email)
    expect(resolved?.profile.volunteerId).toBe(volunteerId)
    expect(resolved?.profile.assignable).toBe(true)
  })

  it('never downgrades an existing ADMIN account on approval', async () => {
    await db.user.create({
      data: { email: application.email, name: 'Existing Admin', role: 'ADMIN' },
    })
    await provisionApprovedVolunteer()
    const user = await db.user.findUniqueOrThrow({ where: { email: application.email } })
    expect(user.role).toBe('ADMIN')
    // …but the volunteer panel row is still provisioned.
    expect(await db.volunteer.count({ where: { userId: user.id } })).toBe(1)
  })

  it('blocks duplicates while pending/approved but allows re-applying after rejection', async () => {
    await submitLawyerApplication(db, { ...application })

    // Still PENDING: a second submission just refreshes the same row.
    await submitLawyerApplication(db, { ...application, region: 'Mumbai' })
    expect(await db.lawyerApplication.count()).toBe(1)

    const app = await getLawyerApplicationByEmail(db, application.email)
    await decideLawyerApplication(db, {
      applicationId: app!.id,
      decision: 'rejected',
      actorId: 'admin_1',
      reason: 'Incomplete bar details',
    })
    await expect(
      decideLawyerApplication(db, {
        applicationId: app!.id,
        decision: 'approved',
        actorId: 'admin_1',
        reason: 'Too late',
      }),
    ).rejects.toThrow(DomainError)

    // Re-application resets the row to PENDING.
    const again = await submitLawyerApplication(db, { ...application, barCouncilId: 'DL/9999/2015' })
    expect(again.status).toBe('PENDING')

    // …and an APPROVED email cannot apply again.
    await decideLawyerApplication(db, {
      applicationId: again.id,
      decision: 'approved',
      actorId: 'admin_1',
      reason: 'Verified now',
    })
    await expect(submitLawyerApplication(db, { ...application })).rejects.toThrow(DomainError)
  })

  it('lists applications filtered by status', async () => {
    await submitLawyerApplication(db, { ...application })
    const pending = await listLawyerApplications(db, { status: 'PENDING' })
    expect(pending).toHaveLength(1)
    expect(pending[0]?.fullName).toBe(application.fullName)
  })
})

describe('offers of help (request → staff confirms)', () => {
  it('files a request without creating an assignment until confirmed', async () => {
    await provisionApprovedVolunteer()
    const volunteer = await getVolunteerForEmail(db, application.email)
    const kasa = await publishedCase('Yamuna pollution')

    await requestCaseForVolunteer(db, { volunteerId: volunteer!.profile.volunteerId, caseId: kasa.id })
    expect(await db.assignmentRequest.count()).toBe(1)
    expect(await db.assignment.count()).toBe(0)

    const queue = await listAssignmentRequests(db, { status: 'PENDING' })
    expect(queue[0]?.caseTitle).toBe('Yamuna pollution')
    expect(queue[0]?.activeCaseCount).toBe(0)

    await decideAssignmentRequest(db, {
      requestId: queue[0]!.id,
      decision: 'approved',
      actorId: 'admin_1',
      reason: 'Capacity confirmed',
    })

    const assignments = await db.assignment.findMany()
    expect(assignments).toHaveLength(1)
    expect(assignments[0]?.kind).toBe('SUPPORT')
    expect(assignments[0]?.status).toBe('ACTIVE')
    expect((await getVolunteerForEmail(db, application.email))!.profile.activeCaseCount).toBe(1)
  })

  it('blocks duplicate pending requests and non-engageable cases', async () => {
    await provisionApprovedVolunteer()
    const volunteer = await getVolunteerForEmail(db, application.email)
    const kasa = await publishedCase('Yamuna pollution')
    await requestCaseForVolunteer(db, { volunteerId: volunteer!.profile.volunteerId, caseId: kasa.id })
    await expect(
      requestCaseForVolunteer(db, { volunteerId: volunteer!.profile.volunteerId, caseId: kasa.id }),
    ).rejects.toThrow(/pending/)

    const unpublished = await submitCampaign(db, {
      entryType: 'funded',
      title: 'Hidden matter',
      summary: 'Not public yet.',
      category: 'OTHER',
      goalAmountPaise: 100_000,
      deadlineAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      track: 'CAMPAIGN',
      whatHappened: '…',
      applicantName: 'X',
    })
    await expect(
      requestCaseForVolunteer(db, { volunteerId: volunteer!.profile.volunteerId, caseId: unpublished.id }),
    ).rejects.toThrow(DomainError)
  })

  it('enforces capacity at request time AND re-checks it at confirmation time', async () => {
    await provisionApprovedVolunteer({ capacityLimit: 1 })
    const volunteerProfile = await getVolunteerForEmail(db, application.email)
    const vid = volunteerProfile!.profile.volunteerId
    const kasa = await publishedCase('First matter')
    const other = await publishedCase('Second matter')

    // Fill the single slot.
    await requestCaseForVolunteer(db, { volunteerId: vid, caseId: kasa.id })
    const [first] = await listAssignmentRequests(db, { status: 'PENDING' })
    await decideAssignmentRequest(db, {
      requestId: first!.id,
      decision: 'approved',
      actorId: 'admin_1',
      reason: 'ok',
    })

    // At capacity: even filing a new offer is refused.
    await expect(
      requestCaseForVolunteer(db, { volunteerId: vid, caseId: other.id }),
    ).rejects.toThrow(/limit/)
  })

  it('confirmation refuses when availability changed between request and decision', async () => {
    await provisionApprovedVolunteer()
    const vid = (await getVolunteerForEmail(db, application.email))!.profile.volunteerId
    const kasa = await publishedCase('Yamuna pollution')

    await requestCaseForVolunteer(db, { volunteerId: vid, caseId: kasa.id })
    await updateVolunteerPreferences(db, { volunteerId: vid, availability: 'busy' })

    const [req] = await listAssignmentRequests(db, { status: 'PENDING' })
    await expect(
      decideAssignmentRequest(db, {
        requestId: req!.id,
        decision: 'approved',
        actorId: 'admin_1',
        reason: 'ok',
      }),
    ).rejects.toThrow(/no longer assignable/)
    expect(await db.assignment.count()).toBe(0)
  })

  it('supports withdrawal, decline-with-reason, and re-offering later', async () => {
    await provisionApprovedVolunteer()
    const vid = (await getVolunteerForEmail(db, application.email))!.profile.volunteerId
    const kasa = await publishedCase('Yamuna pollution')

    await requestCaseForVolunteer(db, { volunteerId: vid, caseId: kasa.id })
    let [req] = await listAssignmentRequests(db, { status: 'PENDING' })
    await withdrawAssignmentRequest(db, { volunteerId: vid, requestId: req!.id })
    expect((await db.assignmentRequest.findUniqueOrThrow({ where: { id: req!.id } })).status).toBe(
      'DECLINED',
    )

    // Re-offer resets the same unique row to PENDING.
    await requestCaseForVolunteer(db, { volunteerId: vid, caseId: kasa.id })
    ;[req] = await listAssignmentRequests(db, { status: 'PENDING' })
    await decideAssignmentRequest(db, {
      requestId: req!.id,
      decision: 'declined',
      actorId: 'admin_1',
      reason: 'Conflict of interest',
    })
    expect(
      (await db.assignmentRequest.findUniqueOrThrow({ where: { id: req!.id } })).decisionReason,
    ).toBe('Conflict of interest')

    await requestCaseForVolunteer(db, { volunteerId: vid, caseId: kasa.id })
    expect(await db.assignmentRequest.count({ where: { status: 'PENDING' } })).toBe(1)
  })

  it('releasing an assignment frees the capacity slot', async () => {
    await provisionApprovedVolunteer({ capacityLimit: 1 })
    const profile = await getVolunteerForEmail(db, application.email)
    const vid = profile!.profile.volunteerId
    const kasa = await publishedCase('Only slot')

    await requestCaseForVolunteer(db, { volunteerId: vid, caseId: kasa.id })
    const [req] = await listAssignmentRequests(db, { status: 'PENDING' })
    await decideAssignmentRequest(db, { requestId: req!.id, decision: 'approved', actorId: 'a', reason: 'ok' })

    const board = await getEngagementBoard(db, vid)
    expect(board.myAssignments).toHaveLength(1)
    expect(board.openCases.find((c) => c.id === kasa.id)?.mine).toBe(true)

    await releaseAssignment(db, { volunteerId: vid, assignmentId: board.myAssignments[0]!.assignmentId })
    expect((await getVolunteerForEmail(db, application.email))!.profile.assignable).toBe(true)
    // Released work does not count against active load.
    expect((await getVolunteerForEmail(db, application.email))!.profile.activeCaseCount).toBe(0)
  })
})

describe('hours and preferences', () => {
  it('accumulates integer hours only', async () => {
    await provisionApprovedVolunteer()
    const vid = (await getVolunteerForEmail(db, application.email))!.profile.volunteerId

    expect(await logVolunteerHours(db, { volunteerId: vid, hours: 3 })).toBe(3)
    expect(await logVolunteerHours(db, { volunteerId: vid, hours: 2, note: 'Drafting' })).toBe(5)
    await expect(logVolunteerHours(db, { volunteerId: vid, hours: 1.5 })).rejects.toThrow(DomainError)
    await expect(logVolunteerHours(db, { volunteerId: vid, hours: -2 })).rejects.toThrow(DomainError)
    expect(await db.auditLog.count({ where: { action: 'volunteer.hours-logged' } })).toBe(2)
  })

  it('validates preference updates', async () => {
    await provisionApprovedVolunteer()
    const vid = (await getVolunteerForEmail(db, application.email))!.profile.volunteerId

    const updated = await updateVolunteerPreferences(db, {
      volunteerId: vid,
      availability: 'BUSY',
      capacityLimit: 6,
      region: 'Mumbai',
    })
    expect(updated.availability).toBe('BUSY')
    expect(updated.capacityLimit).toBe(6)

    await expect(
      updateVolunteerPreferences(db, { volunteerId: vid, availability: 'vacationing' }),
    ).rejects.toThrow(DomainError)
    await expect(
      updateVolunteerPreferences(db, { volunteerId: vid, capacityLimit: 0 }),
    ).rejects.toThrow(DomainError)
  })
})
