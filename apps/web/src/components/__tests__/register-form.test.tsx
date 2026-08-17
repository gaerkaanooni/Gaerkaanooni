import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterForm from '../RegisterForm'

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers a user and redirects to the login page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 })),
    )
    render(<RegisterForm />)
    await userEvent.type(screen.getByLabelText(/name/i), 'Asha Rao')
    await userEvent.type(screen.getByLabelText(/email/i), 'asha@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'supersecret1')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/login'))
  })

  it('surfaces a server-side error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Email already registered' }), { status: 409 })),
    )
    render(<RegisterForm />)
    await userEvent.type(screen.getByLabelText(/name/i), 'Asha Rao')
    await userEvent.type(screen.getByLabelText(/email/i), 'taken@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'supersecret1')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText(/email already registered/i)).toBeInTheDocument()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('reports a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    render(<RegisterForm />)
    await userEvent.type(screen.getByLabelText(/name/i), 'Asha Rao')
    await userEvent.type(screen.getByLabelText(/email/i), 'asha@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'supersecret1')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText(/offline/i)).toBeInTheDocument()
  })
})