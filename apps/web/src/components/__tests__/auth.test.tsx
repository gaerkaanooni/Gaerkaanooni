import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginForm from '../LoginForm'
import RegisterForm from '../RegisterForm'

const { pushMock, refreshMock, signInMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  signInMock: vi.fn(),
}))

vi.mock('next-auth/react', () => ({
  signIn: signInMock,
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}))

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls signIn with the credentials and navigates home on success', async () => {
    signInMock.mockResolvedValue({ error: null })

    render(<LoginForm />)
    await userEvent.type(screen.getByLabelText(/email/i), 'staff@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'long-enough-pass')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() =>
      expect(signInMock).toHaveBeenCalledWith('credentials', {
        email: 'staff@example.com',
        password: 'long-enough-pass',
        redirect: false,
      }),
    )
    expect(pushMock).toHaveBeenCalledWith('/')
  })

  it('shows an error on failed credentials', async () => {
    signInMock.mockResolvedValue({ error: 'CredentialsSignin' })
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
