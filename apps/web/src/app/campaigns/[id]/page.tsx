import { notFound } from 'next/navigation'
import { getPublicCampaign, prisma } from '@pil/db'
import FundingProgress from '@/components/FundingProgress'
import Countdown from '@/components/Countdown'
import UpdateFeed from '@/components/UpdateFeed'
import BackForm from '@/components/BackForm'
import FollowButton from '@/components/FollowButton'
import ViewCampaignTracker from '@/components/ViewCampaignTracker'

const PUBLIC_STAGES = ['LIVE', 'FUNDED', 'DISPATCHED', 'ASSIGNED', 'FILED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
const ACCEPTING_BACKS = ['LIVE', 'FUNDED', 'DISPATCHED']

function Description({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <div className="description">
      {text
        .split(/\n{2,}/)
        .filter((p) => p.trim().length > 0)
        .map((p, i) => (
          <p key={i}>{p}</p>
        ))}
    </div>
  )
}

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const campaign = await getPublicCampaign(prisma, id)
  if (!campaign || !campaign.publishedAt || !PUBLIC_STAGES.includes(campaign.stage)) notFound()

  return (
    <main>
      <ViewCampaignTracker campaignId={campaign.id} />
      <p className="detail-category reveal">
        {campaign.category.toLowerCase()} case · {campaign.region ? `${campaign.region} · ` : ''}registry №{' '}
        {campaign.id.slice(0, 8)}
      </p>
      <div className="detail-file reveal d1">
        <span className="stamp" aria-hidden="true">
          {campaign.stage.replace(/_/g, ' ')}
        </span>
        <h1>{campaign.title}</h1>
        <p className="summary">{campaign.summary}</p>
        <Description text={campaign.description} />
        {campaign.deadlineAt && <Countdown deadlineAt={campaign.deadlineAt} />}
        {campaign.entryType === 'DISPATCHED' ? (
          <p className="funding-figures response-funded">
            <span>⚡ Urgent matter — funded from the response fund</span>
          </p>
        ) : (
          <FundingProgress raisedPaise={campaign.raisedPaise} goalPaise={campaign.goalAmountPaise} />
        )}
        <p className="detail-supporters">
          {campaign.backerCount} backer{campaign.backerCount === 1 ? '' : 's'} · {campaign.supporterCount} supporter
          {campaign.supporterCount === 1 ? '' : 's'}
        </p>
      </div>
      {ACCEPTING_BACKS.includes(campaign.stage) && (
        <>
          <BackForm campaignId={campaign.id} />
          <FollowButton campaignId={campaign.id} />
        </>
      )}
      <h2>Updates</h2>
      <UpdateFeed updates={campaign.updates} />
    </main>
  )
}
