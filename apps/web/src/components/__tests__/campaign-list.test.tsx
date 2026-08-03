import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import CampaignList from '@/components/CampaignList'

const liveCampaign = {
  id: 'c1',
  title: 'Yamuna cleanup',
  summary: 'Cleaning up the river.',
  description: 'A long-form description of the matter.',
  category: 'ENVIRONMENT',
  region: 'Delhi',
  entryType: 'FUNDED' as const,
  stage: 'LIVE',
  goalAmountPaise: 500_000,
  raisedPaise: 250_000,
  deadlineAt: new Date('2026-01-10T00:00:00Z'),
  publishedAt: new Date('2026-01-01T00:00:00Z'),
  backerCount: 2,
  supporterCount: 5,
  contributionCount: 2,
  updates: [],
}

describe('CampaignList', () => {
  it('shows an empty state when no campaigns are live', () => {
    render(<CampaignList campaigns={[]} />)
    expect(screen.getByText('No open campaigns right now.')).toBeInTheDocument()
  })

  it('links each campaign to its detail page with progress and support count', () => {
    render(<CampaignList campaigns={[liveCampaign]} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Yamuna cleanup')
    expect(screen.getByRole('link')).toHaveAttribute('href', '/campaigns/c1')
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('5 supporters')).toBeInTheDocument()
  })
})
