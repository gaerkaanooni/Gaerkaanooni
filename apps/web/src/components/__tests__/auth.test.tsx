import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginForm from '../LoginForm'
import RegisterForm from '../RegisterForm'

const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}))

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts credentials to the unified staff login and navigates to the dashboard on success', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true, email: 'staff@example.com', role: 'ADMIN' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<LoginForm />)
    await userEvent.type(screen.getByLabelText(/email/i), 'staff@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'long-enough-pass')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/staff/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'staff@example.com', password: 'long-enough-pass' }),
        }),
      ),
    )
    expect(pushMock).toHaveBeenCalledWith('/dashboard')
  })

  it('shows an error on failed credentials', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ error: 'Invalid email or password' }), { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<LoginForm />)
    await userEvent.type(screen.getByLabelText(/email/i), 'x@y.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong-password')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument()
  })
})

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts registration and navigates to the login page', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'u1' }), { status: 201 })))

    render(<RegisterForm />)
    await userEvent.type(screen.getByLabelText(/name/i), 'Asha')
    await userEvent.type(screen.getByLabelText(/email/i), 'asha@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'long-enough-pass')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/login'))
  })

  it('shows a server-side error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Password must be at least 8 characters' }), { status: 400 })),
    )
    render(<RegisterForm />)
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'short')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument()
  })
})
