import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import IntakeForm from '../IntakeForm'

/**
 * Referral behavior now lives inside the unified IntakeForm in "for someone else"
 * mode. These tests lock in that mode's behavior (consent-to-contact, referrer,
 * posting to /api/referrals).
 */
describe('IntakeForm (referral mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderOther = () => render(<IntakeForm initialFor="other" />)

  it('requires who the referral is for and the matter', async () => {
    const { container } = renderOther()
    fireEvent.submit(container.querySelector('form') as HTMLFormElement)
    const alerts = await screen.findAllByRole('alert')
    expect(alerts.map((a) => a.textContent?.toLowerCase()).join(' ')).toMatch(/who needs a hearing/i)
  })

  it('submits the referral with the contact and consent when given', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, id: 'r1' }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    renderOther()
    await userEvent.type(screen.getByLabelText(/who needs a fair hearing/i), 'Anita')
    await userEvent.type(screen.getByLabelText(/what happened/i), 'Eviction without notice.')
    await userEvent.type(screen.getByLabelText(/contact for them/i), 'anita@example.com')
    await userEvent.click(screen.getByLabelText(/happy for us to contact them/i))
    await userEvent.click(screen.getByRole('button', { name: /send this referral/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string)
    expect(body.contact).toBe('anita@example.com')
    expect(body.contactConsented).toBe(true)
    expect(await screen.findByText(/received your referral/i)).toBeInTheDocument()
  })

  it('flags consent as false when the checkbox is not ticked', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, id: 'r2' }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    renderOther()
    await userEvent.type(screen.getByLabelText(/who needs a fair hearing/i), 'A friend')
    await userEvent.type(screen.getByLabelText(/what happened/i), 'Wrongful termination.')
    await userEvent.type(screen.getByLabelText(/contact for them/i), 'private@example.com')
    await userEvent.click(screen.getByRole('button', { name: /send this referral/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string)
    expect(body.contactConsented).toBe(false)
    expect(await screen.findByText(/received your referral/i)).toBeInTheDocument()
  })

  it('sends optional category, region, and referrer details', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, id: 'r3' }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    renderOther()
    await userEvent.type(screen.getByLabelText(/who needs a fair hearing/i), 'Meena')
    await userEvent.type(screen.getByLabelText(/what happened/i), 'Denied a school seat.')
    await userEvent.selectOptions(screen.getByLabelText(/category/i), 'EDUCATION')
    await userEvent.type(screen.getByLabelText(/region \/ city/i), 'Delhi')
    await userEvent.type(screen.getByLabelText(/your name/i), 'Ravi')
    await userEvent.click(screen.getByRole('button', { name: /send this referral/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string)
    expect(body.category).toBe('EDUCATION')
    expect(body.region).toBe('Delhi')
    expect(body.referrer).toBe('Ravi')
  })

  it('surfaces a server-side error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Invalid category' }), { status: 400 })),
    )
    renderOther()
    await userEvent.type(screen.getByLabelText(/who needs a fair hearing/i), 'Kiran')
    await userEvent.type(screen.getByLabelText(/what happened/i), 'Something.')
    await userEvent.click(screen.getByRole('button', { name: /send this referral/i }))
    expect(await screen.findByText(/invalid category/i)).toBeInTheDocument()
  })

  it('reports a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    renderOther()
    await userEvent.type(screen.getByLabelText(/who needs a fair hearing/i), 'Kiran')
    await userEvent.type(screen.getByLabelText(/what happened/i), 'Something.')
    await userEvent.click(screen.getByRole('button', { name: /send this referral/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/offline/i)
  })
})
