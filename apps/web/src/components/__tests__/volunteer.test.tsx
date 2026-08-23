import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LawyerApplicationForm from '../LawyerApplicationForm'
import VolunteerWorkspace from '../VolunteerWorkspace'
import LawyerApplicationsQueue from '../LawyerApplicationsQueue'
import VolunteerRequestsQueue from '../VolunteerRequestsQueue'
import type { EngagementBoard, VolunteerProfile } from '@pil/db'

const { pushMock, refreshMock } = vi.hoisted(() => ({ pushMock: vi.fn(), refreshMock: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}))

const profile: VolunteerProfile = {
  volunteerId: 'vol_1',
  name: 'Asha Rao',
  email: 'asha@example.com',
  role: 'LAWYER',
  availability: 'available',
  region: 'Delhi',
  capacityLimit: 2,
  activeCaseCount: 1,
  hoursContributed: 5,
  overCapacity: false,
  assignable: true,
}

const board: EngagementBoard = {
  openCases: [
    {
      id: 'case_open',
      title: 'Yamuna pollution',
      summary: 'Untreated discharge.',
      category: 'ENVIRONMENT',
      region: 'Delhi',
      stage: 'FUNDED',
      entryType: 'FUNDED',
      activeVolunteers: 1,
      mine: false,
      myRequestStatus: null,
    },
    {
      id: 'case_requested',
      title: 'Eviction defence',
      summary: 'Demolition notice.',
      category: 'HOUSING',
      region: null,
      stage: 'LIVE',
      entryType: 'FUNDED',
      activeVolunteers: 0,
      mine: false,
      myRequestStatus: 'PENDING',
    },
    {
      id: 'case_mine',
      title: 'Wage theft claim',
      summary: 'Unpaid wages.',
      category: 'LABOR',
      region: 'Delhi',
      stage: 'ASSIGNED',
      entryType: 'FUNDED',
      activeVolunteers: 2,
      mine: true,
      myRequestStatus: null,
    },
  ],
  myAssignments: [
    {
      assignmentId: 'asg_1',
      caseId: 'case_mine',
      caseTitle: 'Wage theft claim',
      caseRegion: 'Delhi',
      caseStage: 'ASSIGNED',
      kind: 'SUPPORT',
      assignedAt: new Date('2026-08-01'),
    },
  ],
  myPendingRequests: [
    { requestId: 'req_1', caseId: 'case_requested', caseTitle: 'Eviction defence', requestedAt: new Date('2026-08-02') },
  ],
}

describe('LawyerApplicationForm', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it('requires a specialisation before submitting', async () => {
    render(<LawyerApplicationForm />)
    await userEvent.type(screen.getByLabelText(/full name/i), 'Meera Pillai')
    await userEvent.type(screen.getByLabelText(/bar council enrolment/i), 'KL/2041/2013')
    await userEvent.type(screen.getByLabelText(/years of practice/i), '11')
    await userEvent.click(screen.getByRole('button', { name: /submit application/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/at least one area/i)
  })

  it('posts the application with the chosen fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<LawyerApplicationForm defaultName="Meera Pillai" />)
    await userEvent.type(screen.getByLabelText(/bar council enrolment/i), 'KL/2041/2013')
    await userEvent.type(screen.getByLabelText(/years of practice/i), '11')
    await userEvent.click(screen.getByLabelText(/environment$/i))
    await userEvent.selectOptions(screen.getByLabelText(/concurrent cases/i), '3')
    await userEvent.click(screen.getByRole('button', { name: /submit application/i }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/volunteer/apply',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"yearsPractice":11'),
        }),
      ),
    )
    expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body).skills).toEqual(['ENVIRONMENT'])
    expect(await screen.findByText(/application received/i)).toBeInTheDocument()
  })

  it('surfaces server-side validation errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Bar council ID is required' }), { status: 400 })),
    )
    render(<LawyerApplicationForm />)
    await userEvent.type(screen.getByLabelText(/full name/i), 'M P')
    await userEvent.type(screen.getByLabelText(/bar council enrolment/i), 'x')
    await userEvent.type(screen.getByLabelText(/years of practice/i), '2')
    await userEvent.click(screen.getByLabelText(/environment$/i))
    await userEvent.click(screen.getByRole('button', { name: /submit application/i }))
    expect(await screen.findByText(/bar council id is required/i)).toBeInTheDocument()
  })
})

describe('VolunteerWorkspace', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it('shows load, hours, and the pending-offer badge', () => {
    render(<VolunteerWorkspace profile={profile} board={board} />)
    expect(screen.getByText(/pro-bono hours logged/i)).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument() // hours total
    expect(screen.getAllByText(/awaiting confirmation/i).length).toBeGreaterThan(0)
  })

  it('offers to help on an open matter and reports errors from the server', async () => {
    // At capacity (server-provided assignable=false): offer buttons disabled.
    const { unmount } = render(
      <VolunteerWorkspace
        profile={{ ...profile, capacityLimit: 1, activeCaseCount: 1, assignable: false }}
        board={board}
      />,
    )
    for (const b of screen.getAllByRole('button', { name: /offer to help|offer again/i })) {
      expect(b).toBeDisabled()
    }
    unmount()

    // Under capacity, clicking files a request.
    const okMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 }))
    vi.stubGlobal('fetch', okMock)
    render(<VolunteerWorkspace profile={profile} board={board} />)
    await userEvent.click(screen.getAllByRole('button', { name: /offer to help/i })[0]!)
    await waitFor(() =>
      expect(okMock).toHaveBeenCalledWith(
        '/api/volunteer/requests',
        expect.objectContaining({ body: expect.stringContaining('case_open') }),
      ),
    )
  })

  it('releases an assigned case and withdraws a pending offer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<VolunteerWorkspace profile={profile} board={board} />)
    await userEvent.click(screen.getByRole('button', { name: /^release$/i }))
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/volunteer/assignments/release',
        expect.objectContaining({ body: expect.stringContaining('asg_1') }),
      ),
    )
    await userEvent.click(screen.getByRole('button', { name: /withdraw/i }))
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/volunteer/requests/req_1/withdraw',
        expect.anything(),
      ),
    )
  })

  it('logs integer hours', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Hours must be a whole number, at least 1' }), { status: 400 }))
      .mockResolvedValue(new Response(JSON.stringify({ ok: true, total: 7 }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<VolunteerWorkspace profile={profile} board={board} />)
    const input = screen.getByLabelText(/^hours$/i)
    const submit = screen.getByRole('button', { name: /log hours/i })

    // jsdom strips the sign from number inputs, so exercise the server guard
    // with zero instead of a negative.
    await userEvent.type(input, '0')
    await userEvent.click(submit)
    expect(await screen.findByRole('alert')).toHaveTextContent(/whole number/i)

    await userEvent.clear(input)
    await userEvent.type(input, '2')
    await userEvent.click(submit)
    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        '/api/volunteer/hours',
        expect.objectContaining({ body: expect.stringContaining('"hours":2') }),
      ),
    )
    expect(await screen.findByText(/total now 7/i)).toBeInTheDocument()
  })
})

describe('LawyerApplicationsQueue (staff)', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it('approves an application via the decision endpoint', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            applications: [
              {
                id: 'app_1',
                email: 'meera@example.com',
                fullName: 'Meera Pillai',
                barCouncilId: 'KL/2041/2013',
                yearsPractice: 11,
                skills: ['HOUSING'],
                region: 'Kochi',
                capacityLimit: 3,
                motivation: null,
                status: 'PENDING',
                decisionReason: null,
                createdAt: new Date().toISOString(),
              },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValue(new Response(JSON.stringify({ applications: [] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<LawyerApplicationsQueue />)
    expect(await screen.findByText(/meera pillai/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /approve/i }))
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/volunteers/applications/app_1/decision',
        expect.objectContaining({ body: expect.stringContaining('"decision":"approved"') }),
      ),
    )
  })
})

describe('VolunteerRequestsQueue (staff)', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it('requires a reason before declining, then posts the decision', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            requests: [
              {
                id: 'rq_1',
                note: null,
                createdAt: new Date().toISOString(),
                caseTitle: 'Yamuna pollution',
                caseStage: 'LIVE',
                caseRegion: null,
                volunteerName: 'Asha Rao',
                volunteerEmail: 'asha@example.com',
                volunteerSkills: ['ENVIRONMENT'],
                volunteerRegion: null,
                activeCaseCount: 0,
                capacityLimit: 2,
              },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValue(new Response(JSON.stringify({ requests: [] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<VolunteerRequestsQueue />)
    expect(await screen.findByText(/asha rao/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /decline/i }))
    expect(await screen.findByText(/decline reason is required/i)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1) // only the initial list call

    await userEvent.type(screen.getByPlaceholderText(/decline reason/i), 'Conflict of interest')
    await userEvent.click(screen.getByRole('button', { name: /decline/i }))
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/volunteers/requests/rq_1/decision',
        expect.objectContaining({ body: expect.stringContaining('Conflict of interest') }),
      ),
    )
  })
})
