import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BackForm from '../BackForm'
import FollowButton from '../FollowButton'

describe('BackForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects an empty or non-positive amount', async () => {
    render(<BackForm campaignId="c1" />)
    await userEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/positive amount/i)

    await userEvent.type(screen.getByLabelText(/amount/i), '0')
    await userEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/positive amount/i)
  })

  it('posts the amount, confirms through the checkout, and shows a receipt', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'contrib_1', status: 'PENDING', razorpayOrderId: null }), { status: 201 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, status: 'CAPTURED' }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<BackForm campaignId="c1" />)
    await userEvent.type(screen.getByLabelText(/amount/i), '100')
    await userEvent.click(screen.getByRole('button', { name: /back/i }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/campaigns/c1/back',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"grossAmountPaise":10000'),
        }),
      ),
    )

    expect(await screen.findByRole('button', { name: /pay ₹100/i })).toBeInTheDocument()
    expect(screen.getByText(/reaches the case/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /pay ₹100/i }))

    await waitFor(
      () =>
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/campaigns/c1/back/confirm',
          expect.objectContaining({ method: 'POST', body: expect.stringContaining('contrib_1') }),
        ),
      { timeout: 3000 },
    )
    expect(await screen.findByText(/thank you/i)).toBeInTheDocument()
    expect(screen.getByText(/TXN-TRIB_1/i)).toBeInTheDocument()
  })

  it('shows an error message when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })))
    render(<BackForm campaignId="c1" />)
    await userEvent.type(screen.getByLabelText(/amount/i), '50')
    await userEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i)
  })
})

describe('FollowButton', () => {
  it('posts a follow and flips to Following', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<FollowButton campaignId="c1" />)
    await userEvent.click(screen.getByRole('button', { name: /follow/i }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/campaigns/c1/follow',
        expect.objectContaining({ method: 'POST' }),
      ),
    )
    expect(await screen.findByText('Following')).toBeInTheDocument()
  })

  it('reports a failure to follow', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })))
    render(<FollowButton campaignId="c1" />)
    await userEvent.click(screen.getByRole('button', { name: /follow/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not follow/i)
  })
})
