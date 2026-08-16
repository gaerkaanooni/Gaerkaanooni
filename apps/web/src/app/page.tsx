import { listPublicCampaigns, prisma } from '@pil/db'
import CampaignList from '@/components/CampaignList'
import HowItWorks from '@/components/HowItWorks'
import LandingBanner from '@/components/LandingBanner'

const PAISE = 100

export default async function Home() {
  const campaigns = await listPublicCampaigns(prisma)

  const live = campaigns.filter((c) => c.stage === 'LIVE')
  const raisedPaise = campaigns.reduce((sum, c) => sum + c.raisedPaise, 0)
  const supporters = campaigns.reduce((sum, c) => sum + c.supporterCount, 0)
  const backers = campaigns.reduce((sum, c) => sum + c.backerCount, 0)

  const inr = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(raisedPaise / PAISE)

  return (
    <>
      <LandingBanner />
      <main>
        <section className="hero reveal">
          <p className="kicker">A fair hearing shouldn't depend on what you can afford</p>
          <p className="kicker kicker-sub">Legal matters, funded by the public · docket № {String(campaigns.length).padStart(4, '0')}</p>
          <h1>Gaerkaanooni</h1>
          <p className="lede">
            Going to court is hard enough when you have a lawyer behind you — harder still when you cannot afford one.
            Pledge what you can to the matters that need a hearing. You are only charged if a case reaches its goal, and
            if it does not, every backer is refunded in full.
          </p>
          <p className="explainer">
            The cost of a good lawyer should decide who gets heard, it should not. We turn the public into a funder for
            the legal matters people are up against — every case screened by a lawyer, funded by citizens, and followed
            to its judgment. For the person themselves, a friend, a neighbour, a community — no one should lose their
            day in court for want of funds.
          </p>
          <div className="cta-row">
            <a href="/login" className="button">
              Sign in to support
            </a>
            <a href="/submit" className="button ghost">
              Submit a case
            </a>
            <a href="/refer" className="button ghost">
              Refer someone who needs a hearing
            </a>
            <a href="#docket" className="button ghost">
              Explore the docket
            </a>
          </div>
        <div className="rule" />
        <div className="stat-strip">
          <div className="stat">
            <span className="n">{campaigns.length}</span>
            <span className="l">open matters</span>
          </div>
          <div className="stat">
            <span className="n">{live.length}</span>
            <span className="l">live &amp; funding</span>
          </div>
          <div className="stat">
            <span className="n">{inr}</span>
            <span className="l">committed</span>
          </div>
          <div className="stat">
            <span className="n">{supporters + backers}</span>
            <span className="l">citizens engaged</span>
          </div>
        </div>
      </section>

      <div className="section-head reveal d1">
        <span className="no">§ I</span>
        <h2>The docket</h2>
        <span className="line" />
      </div>

      <span id="docket" className="anchor" />
      <CampaignList campaigns={campaigns} />

      <HowItWorks />

      <div className="about-teaser reveal">
        <p className="kicker">The founding story</p>
        <h2>Why Gaerkaanooni exists</h2>
        <p>
          Courts are meant to be the last defence — but good lawyering is expensive, and too many people never get a
          fair hearing simply because they cannot afford one. We are building a different kind of funder: the public,
          organised with rigour, for the legal matters that need it most.
        </p>
        <a href="/about" className="button">
          Read the full story →
        </a>
      </div>
      </main>
    </>
  )
}
