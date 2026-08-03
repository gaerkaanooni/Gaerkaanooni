import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import FundingProgress from '../FundingProgress'
import Countdown from '../Countdown'
import UpdateFeed from '../UpdateFeed'
import { formatRupees } from '@/lib/money'

describe('formatRupees', () => {
  it('formats paise in Indian grouping', () => {
    expect(formatRupees(199_000)).toBe('₹1,990')
    expect(formatRupees(1_000_000_00)).toBe('₹10,00,000')
    expect(formatRupees(0)).toBe('₹0')
  })
  it('keeps fractional rupees', () => {
    expect(formatRupees(199_50)).toBe('₹199.5')
  })
})

describe('FundingProgress', () => {
  it('shows raised, goal, percent, and a bar', () => {
    render(<FundingProgress raisedPaise={250_000} goalPaise={500_000} />)
    expect(screen.getByText('₹2,500')).toBeInTheDocument()
    expect(screen.getByText(/₹5,000/)).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByTestId('funding-bar')).toHaveStyle({ width: '50%' })
  })
  it('caps the bar at 100% on overfunding', () => {
    render(<FundingProgress raisedPaise={600_000} goalPaise={500_000} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByTestId('funding-bar')).toHaveStyle({ width: '100%' })
  })
})

describe('Countdown', () => {
  const now = new Date('2026-01-01T00:00:00Z')
  it('shows days left', () => {
    render(<Countdown deadlineAt={new Date('2026-01-10T00:00:00Z')} now={now} />)
    expect(screen.getByText('9 days left')).toBeInTheDocument()
  })
  it('shows ends today', () => {
    render(<Countdown deadlineAt={new Date('2026-01-01T12:00:00Z')} now={now} />)
    expect(screen.getByText('Ends today')).toBeInTheDocument()
  })
  it('shows ended once past the deadline', () => {
    render(<Countdown deadlineAt={new Date('2025-12-31T00:00:00Z')} now={now} />)
    expect(screen.getByText('Ended')).toBeInTheDocument()
  })
})

describe('UpdateFeed', () => {
  it('shows an empty state when there are no updates', () => {
    render(<UpdateFeed updates={[]} />)
    expect(screen.getByText('No updates yet.')).toBeInTheDocument()
  })
  it('lists each update with title and body', () => {
    render(
      <UpdateFeed
        updates={[
          { id: '1', title: 'Filed', body: 'Filed in court.', createdAt: new Date('2026-01-01T00:00:00Z') },
        ]}
      />,
    )
    expect(screen.getByText('Filed')).toBeInTheDocument()
    expect(screen.getByText('Filed in court.')).toBeInTheDocument()
  })
})
