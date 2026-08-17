import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReferralsList, { type ReferralRow } from '../ReferralsList'

const row = (over: Partial<ReferralRow> = {}): ReferralRow => ({
  id: 'r1',
  referredFor: 'Anita',
  category: 'HOUSING',
  matter: 'Facing eviction without notice.',
  region: 'Mumbai',
  contact: 'anita@example.com',
  referrer: 'Ravi',
  status: 'NEW',
  createdAt: '2026-08-01T00:00:00.000Z',
  ...over,
})

describe('ReferralsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows an empty state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ referrals: [] }), { status: 200 })))
    render(<ReferralsList />)
    expect(await screen.findByText(/no referrals yet/i)).toBeInTheDocument()
  })

  it('renders referrals with consent-gated contact', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            referrals: [row(), row({ id: 'r2', referredFor: 'A friend', contact: null, referrer: null })],
          }),
          { status: 200 },
        ),
      ),
    )
    render(<ReferralsList />)
    expect(await screen.findByText(/Anita/)).toBeInTheDocument()
    expect(screen.getByText(/Referred by Ravi/i)).toBeInTheDocument()
    expect(screen.getByText(/Anonymous referral/i)).toBeInTheDocument()
  })

  it('advances a referral through the triage statuses', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ referrals: [row()] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, status: 'CONTACTED' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ referrals: [row({ status: 'CONTACTED' })] }), { status: 200 }),
      )
    vi.stubGlobal('fetch', fetchMock)

    render(<ReferralsList />)
    await screen.findByText(/Anita/)
    await userEvent.click(screen.getByRole('button', { name: /NEW → next/i }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/referrals/r1',
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'CONTACTED' }) }),
      ),
    )
    await screen.findByRole('button', { name: /CONTACTED → next/i })
  })

  it('disables the advance button once a referral is closed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ referrals: [row({ status: 'CLOSED' })] }), { status: 200 }),
      ),
    )
    render(<ReferralsList />)
    await screen.findByText(/Anita/)
    expect(await screen.findByRole('button', { name: /Closed/i })).toBeDisabled()
  })

  it('shows an error when the list cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'x' }), { status: 500 })),
    )
    render(<ReferralsList />)
    expect(await screen.findByText(/no referrals yet/i)).toBeInTheDocument()
  })
})