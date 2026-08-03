import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CampaignForm from '../CampaignForm'
import ResponseIntakeForm from '../ResponseIntakeForm'

describe('CampaignForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('requires a title and a narrative before submitting', async () => {
    render(<CampaignForm />)
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(await screen.findAllByRole('alert').then((a) => a.length)).toBeGreaterThan(0)
  })

  it('posts the campaign and shows a success link', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'c1', stage: 'SUBMITTED' }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<CampaignForm />)
    await userEvent.type(screen.getByLabelText(/title/i), 'Yamuna cleanup')
    await userEvent.type(screen.getByLabelText(/summary/i), 'Cleaning up the river.')
    await userEvent.type(screen.getByLabelText(/what happened/i), 'Ongoing discharge for months.')
    await userEvent.type(screen.getByLabelText(/goal/i), '100000')
    await userEvent.selectOptions(screen.getByLabelText(/category/i), 'ENVIRONMENT')
    await userEvent.type(screen.getByLabelText(/applicant name/i), 'Asha Rao')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/campaigns',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"goalAmountPaise":10000000'),
        }),
      ),
    )
    expect(await screen.findByRole('link', { name: /view case/i })).toHaveAttribute('href', '/campaigns/c1')
  })

  it('surfaces a server-side validation error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'title is required' }), { status: 400 })),
    )
    render(<CampaignForm />)
    await userEvent.type(screen.getByLabelText(/title/i), 'T')
    await userEvent.type(screen.getByLabelText(/summary/i), 'S')
    await userEvent.type(screen.getByLabelText(/what happened/i), 'Something.')
    await userEvent.type(screen.getByLabelText(/goal/i), '1000')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(await screen.findByText(/title is required/i)).toBeInTheDocument()
  })
})

describe('ResponseIntakeForm', () => {
  it('requires a narrative', async () => {
    render(<ResponseIntakeForm />)
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/what happened/i)
  })

  it('posts the intake and shows a success message', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'r1' }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<ResponseIntakeForm />)
    await userEvent.type(screen.getByLabelText(/what happened/i), 'Imminent eviction of 50 families.')
    await userEvent.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/response-intake',
        expect.objectContaining({ method: 'POST', body: expect.stringContaining('Imminent eviction') }),
      ),
    )
    expect(await screen.findByText(/received/i)).toBeInTheDocument()
  })
})
