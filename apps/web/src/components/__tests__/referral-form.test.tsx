import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReferForm from '../ReferForm'

describe('ReferForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires who the referral is for and the matter', async () => {
    const { container } = render(<ReferForm />)
    fireEvent.submit(container.querySelector('form') as HTMLFormElement)
    expect(await screen.findByRole('alert')).toHaveTextContent(/who needs a hearing/i)
  })

  it('submits the referral with the contact and consent when given', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, id: 'r1' }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<ReferForm />)
    await userEvent.type(screen.getByLabelText(/who needs a fair hearing/i), 'Anita')
    await userEvent.type(screen.getByLabelText(/matter about/i), 'Eviction without notice.')
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

    render(<ReferForm />)
    await userEvent.type(screen.getByLabelText(/who needs a fair hearing/i), 'A friend')
    await userEvent.type(screen.getByLabelText(/matter about/i), 'Wrongful termination.')
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

    render(<ReferForm />)
    await userEvent.type(screen.getByLabelText(/who needs a fair hearing/i), 'Meena')
    await userEvent.type(screen.getByLabelText(/matter about/i), 'Denied a school seat.')
    await userEvent.selectOptions(screen.getByLabelText(/category/i), 'EDUCATION')
    await userEvent.type(screen.getByLabelText(/region/i), 'Delhi')
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
    render(<ReferForm />)
    await userEvent.type(screen.getByLabelText(/who needs a fair hearing/i), 'Kiran')
    await userEvent.type(screen.getByLabelText(/matter about/i), 'Something.')
    await userEvent.click(screen.getByRole('button', { name: /send this referral/i }))
    expect(await screen.findByText(/invalid category/i)).toBeInTheDocument()
  })

  it('reports a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    render(<ReferForm />)
    await userEvent.type(screen.getByLabelText(/who needs a fair hearing/i), 'Kiran')
    await userEvent.type(screen.getByLabelText(/matter about/i), 'Something.')
    await userEvent.click(screen.getByRole('button', { name: /send this referral/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/offline/i)
  })
})