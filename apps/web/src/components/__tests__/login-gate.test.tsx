import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginGate from '../LoginGate'

const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}))

beforeEach(() => {
  vi.clearAllMocks()
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
    await userEvent.type(screen.getByLabelText(/phone number/i), '+919876543210')
    await userEvent.click(screen.getByRole('button', { name: /send me a code/i }))

    expect(await screen.findByText(/your code is/i)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/6-digit code/i), '123456')
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/'))
    expect(refreshMock).toHaveBeenCalled()
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
    await userEvent.type(screen.getByLabelText(/phone number/i), '+919876543210')
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

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/'))
  })
})
