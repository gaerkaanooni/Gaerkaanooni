import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginGate from '../LoginGate'

// goAfterLogin hard-navigates via window.location.assign (stale-chunk safety);
// jsdom needs the method stubbed per test.
const assignMock = vi.fn()

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(window, 'location', {
    value: { ...window.location, assign: assignMock },
    writable: true,
    configurable: true,
  })
})

describe('LoginGate', () => {
  it('sends an OTP and completes sign-in with the returned dev code', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ sent: true, devCode: '123456' }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 })),
    )

    render(<LoginGate />)
    await userEvent.type(screen.getByLabelText(/email address/i), 'citizen@example.com')
    await userEvent.click(screen.getByRole('button', { name: /send me a code/i }))

    expect(await screen.findByText(/your code is/i)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/6-digit code/i), '123456')
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    await waitFor(() => expect(assignMock).toHaveBeenCalledWith('/'))
  })

  it('shows an error when the code is invalid', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ sent: true, devCode: '111111' }), { status: 200 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: 'Invalid or expired code' }), { status: 400 }),
        ),
    )

    render(<LoginGate />)
    await userEvent.type(screen.getByLabelText(/email address/i), 'citizen@example.com')
    await userEvent.click(screen.getByRole('button', { name: /send me a code/i }))
    await userEvent.type(screen.getByLabelText(/6-digit code/i), '000000')
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    expect(await screen.findByText(/invalid or expired code/i)).toBeInTheDocument()
  })

  it('signs in with Google via the mock provider', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, mock: true }), { status: 200 })),
    )

    render(<LoginGate />)
    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }))

    await waitFor(() => expect(assignMock).toHaveBeenCalledWith('/'))
  })

  it('redirects to the Google consent screen when an OAuth url is returned', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true, url: 'https://accounts.google.com/o/oauth2/auth?x=1' }), { status: 200 }),
      ),
    )
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    })

    render(<LoginGate />)
    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }))

    await waitFor(() => expect(window.location.href).toBe('https://accounts.google.com/o/oauth2/auth?x=1'))
    expect(assignMock).not.toHaveBeenCalled()
  })

  it('returns to the email step and resends to a new address', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ sent: true, devCode: '111111' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ sent: true, devCode: '222222' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<LoginGate />)
    await userEvent.type(screen.getByLabelText(/email address/i), 'first@example.com')
    await userEvent.click(screen.getByRole('button', { name: /send me a code/i }))
    expect(await screen.findByText(/your code is/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /change email/i }))
    const emailInput = await screen.findByLabelText(/email address/i)
    expect(emailInput).toBeInTheDocument()
    await userEvent.clear(emailInput)
    await userEvent.type(emailInput, 'second@example.com')
    await userEvent.click(screen.getByRole('button', { name: /send me a code/i }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        '/api/public-auth/otp',
        expect.objectContaining({ body: JSON.stringify({ email: 'second@example.com' }) }),
      ),
    )
    expect(await screen.findByText(/222222/)).toBeInTheDocument()
  })

  it('surfaces an error when the OTP request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Email is not allowed' }), { status: 400 })),
    )
    render(<LoginGate />)
    await userEvent.type(screen.getByLabelText(/email address/i), 'blocked@example.com')
    await userEvent.click(screen.getByRole('button', { name: /send me a code/i }))
    expect(await screen.findByText(/email is not allowed/i)).toBeInTheDocument()
  })
})
