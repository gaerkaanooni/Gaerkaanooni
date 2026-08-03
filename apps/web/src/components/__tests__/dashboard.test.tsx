import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import CaseTable from '../CaseTable'
import VolunteerDirectory from '../VolunteerDirectory'
import FinancialSummaryCard from '../FinancialSummaryCard'

describe('CaseTable', () => {
  it('renders each case with its stage and raised total', () => {
    render(
      <CaseTable
        rows={[
          {
            id: 'c1',
            entryType: 'FUNDED',
            title: 'Yamuna',
            category: 'ENVIRONMENT',
            region: 'Delhi',
            stage: 'LIVE',
            goalAmountPaise: 500_000,
            raisedPaise: 250_000,
            submittedAt: new Date('2026-01-01T00:00:00Z'),
            publishedAt: new Date('2026-01-02T00:00:00Z'),
            deadlineAt: null,
            lastUpdateAt: null,
            overdueUpdate: false,
            staleStage: false,
            needsSignoff: false,
          },
        ]}
      />,
    )
    expect(screen.getByText('Yamuna')).toBeInTheDocument()
    expect(screen.getByText('LIVE')).toBeInTheDocument()
    expect(screen.getByText('₹2,500 of ₹5,000')).toBeInTheDocument()
  })

  it('flags overdue updates, stale stages, and sign-off requirements', () => {
    render(
      <CaseTable
        rows={[
          {
            id: 'c1',
            entryType: 'FUNDED',
            title: 'Stale one',
            category: 'OTHER',
            region: null,
            stage: 'SUBMITTED',
            goalAmountPaise: 100_000,
            raisedPaise: 0,
            submittedAt: new Date('2026-01-01T00:00:00Z'),
            publishedAt: null,
            deadlineAt: null,
            lastUpdateAt: null,
            overdueUpdate: true,
            staleStage: true,
            needsSignoff: true,
          },
        ]}
      />,
    )
    expect(screen.getByText('Update overdue')).toBeInTheDocument()
    expect(screen.getByText('Stale stage')).toBeInTheDocument()
    expect(screen.getByText('Needs sign-off')).toBeInTheDocument()
  })
})

describe('VolunteerDirectory', () => {
  it('shows load vs capacity per volunteer', () => {
    render(
      <VolunteerDirectory
        volunteers={[
          {
            volunteerId: 'v1',
            name: 'Lawyer One',
            role: 'LAWYER',
            availability: 'AVAILABLE',
            region: 'Delhi',
            capacityLimit: 5,
            activeAssignments: 2,
            hoursContributed: 12,
          },
        ]}
      />,
    )
    expect(screen.getByText('Lawyer One')).toBeInTheDocument()
    expect(screen.getByText('2 / 5 active')).toBeInTheDocument()
    expect(screen.getByText('12 hrs')).toBeInTheDocument()
  })
})

describe('FinancialSummaryCard', () => {
  it('shows raised, refunded, disbursed, and the response fund', () => {
    render(
      <FinancialSummaryCard
        summary={{
          totalRaisedPaise: 1_000_000,
          totalRefundedPaise: 100_000,
          totalDisbursedPaise: 200_000,
          totalFeesPaise: 50_000,
          responseFundBalancePaise: 40_000,
        }}
      />,
    )
    expect(screen.getByText('₹10,000')).toBeInTheDocument()
    expect(screen.getByText('₹1,000')).toBeInTheDocument()
    expect(screen.getByText('₹400')).toBeInTheDocument()
  })
})
