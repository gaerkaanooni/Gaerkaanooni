import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import {
  backCase,
  captureContribution,
  followCase,
  postCaseUpdate,
  prisma,
  publishCampaign,
  publishResponsePage,
  screenCase,
  seedResponseFund,
  setRole,
  submitCampaign,
  submitUrgent,
  verifyUrgentSubmission,
} from '@pil/db'

const db = prisma as PrismaClient

async function truncateAll() {
  const tables = await db.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'
  `
  for (const { tablename } of tables) {
    await db.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE`)
  }
}

const DAY = 24 * 60 * 60 * 1000
const future = (days: number) => new Date(Date.now() + days * DAY)
const past = (days: number) => new Date(Date.now() - days * DAY)
const toPaise = (rupees: number) => Math.round(rupees * 100)

async function createUsers() {
  const hash = await bcrypt.hash('seed-pass-123', 10)
  const upsert = async (email: string, name: string, role: 'ADMIN' | 'LAWYER' | 'INTERN' | 'BACKER') => {
    const user = await db.user.upsert({
      where: { email },
      update: {},
      create: { email, name, passwordHash: hash, role },
    })
    if (user.role !== role) await setRole(db, { userId: user.id, role, actorId: 'seed' })
    return user
  }
  const admin = await upsert('admin@pilpromax.org', 'Aarti Deshmukh', 'ADMIN')
  const lawyer = await upsert('lawyer@pilpromax.org', 'Rohan Mehta', 'LAWYER')
  const intern = await upsert('intern@pilpromax.org', 'Nisha Iyer', 'INTERN')
  const verifier = await upsert('verifier@pilpromax.org', 'Kavya Nair', 'LAWYER')
  const backer = await upsert('backer@example.com', 'Sanjay Kumar', 'BACKER')

  const mkVol = async (userId: string, role: 'LAWYER' | 'VERIFIER' | 'CASE_MANAGER', capacityLimit: number, skills: string[]) => {
    await db.volunteer.upsert({
      where: { userId },
      update: {},
      create: { userId, role, capacityLimit, skills, region: 'Delhi', availability: 'AVAILABLE', hoursContributed: 0 },
    })
  }
  await mkVol(lawyer.id, 'LAWYER', 5, ['environment', 'civil-liberties'])
  await mkVol(verifier.id, 'VERIFIER', 3, ['verification'])
  await mkVol(intern.id, 'CASE_MANAGER', 8, ['research', 'case-management'])
  return { admin, lawyer, intern, verifier, backer }
}

async function seedLiveYamuna(users: Awaited<ReturnType<typeof createUsers>>) {
  const c = await submitCampaign(db, {
    entryType: 'funded',
    title: 'Restore the Yamuna: stop untreated discharge',
    summary:
      'Industrial units have discharged untreated effluent into the Yamuna for two decades. We are seeking a court order for continuous effluent monitoring and public health restitution.',
    description: `The Yamuna carries the waste of Delhi's industry and the consequences land on the people who live and farm along its banks. For twenty years, industrial units in the Najafgarh drain corridor have discharged untreated effluent into the river — heavy metals, dyes, and organic load that render the water unusable for drinking, irrigation, and bathing.

The harm is not abstract. More than a million people downstream draw on a waterway that fails even basic safety standards. Farmers irrigate with it; children play where it runs; communities report skin and respiratory illness without any enforceable remedy, because pollution enforcement is fragmented across agencies that rarely speak to one another.

Our petition asks the high court for three concrete things: continuous automated monitoring at every major industrial outfall along the corridor, a public schedule of what has been discharged and by whom, and a restitution order requiring the polluting units to fund the river's rehabilitation rather than leaving the cost to taxpayers.

Your contribution goes to counsel fees, expert evidence from a certified laboratory, and the court fees required to keep this case moving. Every rupee is accounted for on the campaign ledger, and you will receive an update after each hearing.`,
    category: 'ENVIRONMENT',
    region: 'Delhi',
    goalAmountPaise: toPaise(5_00_000),
    deadlineAt: future(30),
    track: 'CAMPAIGN',
    whatHappened:
      'Two decades of untreated industrial discharge into the Yamuna, affecting water supply for over a million people downstream.',
    where: 'Najafgarh drain corridor, Delhi',
    when: 'Ongoing since 2004',
    applicantName: 'Asha Rao',
    contact: 'asha@example.com',
  })
  await screenCase(db, { caseId: c.id, decidedBy: users.lawyer.id, isEligible: true, reason: 'Falls within environmental PIL scope.' })
  await publishCampaign(db, { caseId: c.id, actorId: users.intern.id })
  await db.case.update({ where: { id: c.id }, data: { activeSinceAt: past(2) } })

  const b1 = await backCase(db, { caseId: c.id, backerId: users.backer.id, grossAmountPaise: toPaise(10_000), gatewayFeePaise: 0 })
  await captureContribution(db, { contributionId: b1.id, gatewayFeePaise: 0 })
  const b2 = await backCase(db, { caseId: c.id, backerId: 'anonymous', grossAmountPaise: toPaise(20_000), gatewayFeePaise: 0 })
  await captureContribution(db, { contributionId: b2.id, gatewayFeePaise: 0 })
  await followCase(db, { caseId: c.id, userId: 'anonymous' })

  await postCaseUpdate(db, {
    caseId: c.id,
    authorId: users.lawyer.id,
    title: 'Screening complete — campaign launched',
    body: 'The petition was reviewed and found eligible. We have launched this campaign to raise funds for counsel fees and expert evidence.',
  })
  await postCaseUpdate(db, {
    caseId: c.id,
    authorId: users.lawyer.id,
    title: 'Effluent sampling underway',
    body: 'We have contracted a certified lab to sample the Najafgarh drain corridor. First results expected within 10 days.',
  })
  return c
}

async function seedLiveCrisisCenter(users: Awaited<ReturnType<typeof createUsers>>) {
  const c = await submitCampaign(db, {
    entryType: 'funded',
    title: 'A safe city: fund a rape-crisis legal cell',
    summary:
      'Victims of sexual assault in Mumbai wait weeks for legal aid. We are funding a dedicated crisis cell with a lawyer, counsellor, and emergency helpline.',
    description: `After an assault, the first hours decide everything — whether a complaint is filed correctly, whether the survivor is protected from pressure and delay, and whether the investigation is handled with dignity. In Mumbai, survivors routinely wait weeks for legal advice, often relying on duty counsel they meet for the first time at the police station.

This campaign funds a dedicated crisis cell: a lawyer trained in the law on sexual assault, a counsellor who stays with the survivor through the process, and an emergency helpline that answers within the critical first 72 hours. The cell works alongside the police and hospitals so that a complaint, a medical examination, and legal protection are secured without re-traumatising the survivor.

The cell is run by volunteer lawyers already screened by our team. Funding covers the helpline, the counsellor's time, and the legal aid that makes the difference between a case that dies in a file drawer and one that reaches court.

Your pledge becomes an order only when the campaign reaches its goal; if it does not, every backer is refunded in full. You will see exactly where the money goes, line by line, in the case ledger.`,
    category: 'CIVIL_LIBERTIES',
    region: 'Mumbai',
    goalAmountPaise: toPaise(10_00_000),
    deadlineAt: future(45),
    track: 'CAMPAIGN',
    whatHappened: 'Survivors routinely lose access to timely legal advice after assault.',
    where: 'Mumbai Metropolitan Region',
    when: 'Since 2021',
    applicantName: 'Meera Pillai',
    contact: 'meera@example.com',
  })
  await screenCase(db, { caseId: c.id, decidedBy: users.lawyer.id, isEligible: true, reason: 'Civil-liberties concern with a direct public remedy.' })
  await publishCampaign(db, { caseId: c.id, actorId: users.intern.id })

  const b = await backCase(db, { caseId: c.id, backerId: users.backer.id, grossAmountPaise: toPaise(50_000), gatewayFeePaise: 0 })
  await captureContribution(db, { contributionId: b.id, gatewayFeePaise: 0 })

  await postCaseUpdate(db, {
    caseId: c.id,
    authorId: users.lawyer.id,
    title: 'Helpline pilots next week',
    body: 'Three volunteer lawyers are on board. The emergency helpline will pilot in the western suburbs from Monday.',
  })
  return c
}

async function seedFundedShelter(users: Awaited<ReturnType<typeof createUsers>>) {
  const c = await submitCampaign(db, {
    entryType: 'funded',
    title: 'Right to shelter: evicted mill workers',
    summary:
      'Twelve hundred former mill workers were evicted without alternate housing. The goal was met and the case has been filed in the Bombay High Court.',
    description: `When a Bengaluru textile mill shut down in March 2026, twelve hundred workers lost their homes along with their jobs. The company had housed its workforce in quarters attached to the mill; on closure, it evicted them without any alternate arrangement, in spite of a statutory obligation to provide housing security for retrenched workers.

The workers are not asking for charity. They are asking for what the law already promises: notice, rehabilitation, and a roof. The eviction pushed families into rented rooms they cannot afford on retrenchment wages, and into daily insecurity.

This campaign reached its funding goal, and the writ petition has now been filed in the Bombay High Court. Your support has already done the essential work — engaging counsel and covering filing fees. The remaining funds sustain the litigation through hearings.

From here, every hearing outcome is posted as an update on this page. If the court orders rehabilitation, we will publish the order in full. That is the commitment: not just to file, but to follow the case to its end, and to show every supporter exactly what their contribution made possible.`,
    category: 'LABOR',
    region: 'Bengaluru',
    goalAmountPaise: toPaise(3_00_000),
    deadlineAt: future(15),
    track: 'CAMPAIGN',
    whatHappened: 'Workers evicted from company housing after mill closure.',
    where: 'Peenya Industrial Area',
    when: 'March 2026',
    applicantName: 'Imran Shaikh',
    contact: 'imran@example.com',
  })
  await screenCase(db, { caseId: c.id, decidedBy: users.lawyer.id, isEligible: true, reason: 'Labour rights within PIL scope.' })
  await publishCampaign(db, { caseId: c.id, actorId: users.intern.id })

  const b = await backCase(db, { caseId: c.id, backerId: users.backer.id, grossAmountPaise: toPaise(4_00_000), gatewayFeePaise: 0 })
  await captureContribution(db, { contributionId: b.id, gatewayFeePaise: 0 })

  await postCaseUpdate(db, {
    caseId: c.id,
    authorId: users.lawyer.id,
    title: 'Goal reached — filing in progress',
    body: 'We have crossed the funding goal. Counsel has been engaged and the writ petition will be filed next week.',
  })
  return c
}

async function seedPipeline() {
  const pending = await submitCampaign(db, {
    entryType: 'funded',
    title: 'Air-quality monitors for school zones',
    summary: 'Install low-cost air-quality sensors outside 50 government schools in Delhi.',
    description: `Children in Delhi breathe some of the worst air in the world, and no school in the city — public or private — currently publishes the air quality its students inhale during morning assembly. AQI figures from distant monitoring stations do not reflect the diesel bus queue at the school gate.

We want to change the information landscape. Low-cost calibrated sensors, installed outside fifty government schools, will publish real-time, minute-by-minute air quality in a public dashboard. When pollution spikes, schools will finally have the data to move assemblies indoors and close windows — actions that are proven to cut children's exposure.

The sensors are already on the market and the installation model has been proven in two pilot schools. Funding covers the devices, calibration, and the maintenance contract that keeps data honest. It also funds the request before the authorities: a modest one — publish the air quality children breathe — that becomes far harder to ignore when fifty schools' worth of citizens demand it.`,
    category: 'ENVIRONMENT',
    region: 'Delhi',
    goalAmountPaise: toPaise(2_00_000),
    deadlineAt: future(40),
    track: 'CAMPAIGN',
    whatHappened: 'Schoolchildren are exposed to hazardous AQI levels during morning assemblies.',
    where: 'Delhi NCR',
    when: 'Ongoing',
    applicantName: 'Priya Sharma',
    contact: 'priya@example.com',
  })
  await db.case.update({ where: { id: pending.id }, data: { createdAt: past(2) } })

  const approved = await submitCampaign(db, {
    entryType: 'funded',
    title: 'Consumer refunds for cancelled bus passes',
    summary: 'A transport operator refuses refunds after cancelling seasonal passes mid-term.',
    description: `Thousands of commuters in Hyderabad paid in advance for full-year seasonal bus passes, only for the operator to fold the service after four months — keeping the money for the remaining eight. Individual consumers have little leverage: the amounts are too small for each person to fight, and the operator has refused every written request for a refund.

This is a textbook case for a group remedy. One petition can recover the unserved portion of the passes for every affected commuter, and it sends the signal that advance payments cannot simply be pocketed when a service stops.

The amount sought per commuter is small; the principle is large. Funding covers drafting the petition, the court fee, and notice to the thousands of affected passengers so they can register their claims in a single proceeding. If the operator settles, refunds flow directly to the people who paid.`,
    category: 'CONSUMER',
    region: 'Hyderabad',
    goalAmountPaise: toPaise(80_000),
    deadlineAt: future(25),
    track: 'CAMPAIGN',
    whatHappened: 'Passengers paid for full-year passes; the service folded after four months.',
    where: 'Hyderabad',
    when: 'June 2026',
    applicantName: 'Varun Reddy',
    contact: 'varun@example.com',
  })
  await screenCase(db, { caseId: approved.id, decidedBy: 'lawyer@pilpromax.org', isEligible: true, reason: 'Consumer grievance affecting many, suitable for a group remedy.' })
  return { pending, approved }
}

async function seedResponseTrack(users: Awaited<ReturnType<typeof createUsers>>) {
  await seedResponseFund(db, toPaise(2_00_000))

  const eviction = await submitUrgent(db, {
    whatHappened: 'Forty families are facing eviction from a notified slum cluster in three days. Interim protection is needed immediately.',
    where: 'Noida Sector 45',
    when: 'Eviction scheduled this week',
    applicantName: 'Rekha Devi',
    contact: 'rekha@example.com',
  })
  await db.case.update({
    where: { id: eviction.id },
    data: {
      title: 'Halt the eviction of 40 families in Noida',
      summary:
        'Forty families face eviction from a notified slum cluster with no alternate housing arranged. An interim stay has been secured; the resettlement conditions are heard next.',
      category: 'CIVIL_LIBERTIES',
      region: 'Noida, UP',
      description: `The letter from the authority gave the forty families of the notified cluster in Noida Sector 45 three days to leave their homes. Children in school, elderly residents, workers whose livelihoods are tied to the neighbourhood — all of it uprooted with no alternate housing arranged and no chance of review.

Clearance of a notified cluster is one thing; rehabilitation is not optional. The law promises notice, resettlement, and a humane timeline to every family displaced by the state. With no arrangement made, the eviction notice was unlawful on its face.

A volunteer lawyer from our roster reviewed the notice within hours, and the response fund covered the urgent petition. The high court has now granted an interim stay — the families are safe for the moment — and the next hearing will decide the conditions of any resettlement.

This page is the public record of the matter. Updates are posted at every hearing, and every rupee drawn from the response fund is accounted for on the case ledger. When a resettlement order is passed, it will be published here in full.`,
    },
  })
  const dispatched = await verifyUrgentSubmission(db, {
    caseId: eviction.id,
    decidedBy: users.verifier.id,
    verified: true,
    reason: 'Eviction notice verified with the local authority.',
  })
  await publishResponsePage(db, { caseId: eviction.id, actorId: users.intern.id })
  await postCaseUpdate(db, {
    caseId: eviction.id,
    authorId: users.lawyer.id,
    title: 'Interim stay secured',
    body: 'The high court granted an interim stay on the eviction. Next hearing in two weeks.',
  })

  const awaiting = await submitUrgent(db, {
    whatHappened: 'A riverbed mining operation is actively destroying a floodplain and needs urgent restraint.',
    where: 'Uttarakhand foothills',
    when: 'Active now',
    applicantName: 'Ganesh Bhatt',
    contact: 'ganesh@example.com',
  })
  await db.case.update({
    where: { id: awaiting.id },
    data: {
      title: 'Restrain riverbed mining in the Uttarakhand foothills',
      summary:
        'A verified mining operation is excavating a floodplain in real time. Dispatch is blocked only by the response fund balance.',
      category: 'ENVIRONMENT',
      region: 'Uttarakhand foothills',
      goalAmountPaise: toPaise(5_00_000),
      description: `Satellite imagery from the past month shows a riverbed mining operation advancing into a floodplain in the Uttarakhand foothills — an active, ongoing harm. Every week of delay lets more of the floodplain be excavated, destabilising the river and the villages that depend on it.

The matter has been verified by our verifier network, but the response fund's balance is currently below the budget this dispatch requires. Replenishment is the only thing standing between this floodplain and a restraint order.

The response fund defends exactly this kind of time-critical harm: evictions, demolitions, and environmental destruction that cannot wait for a campaign.`,
    },
  })
  await verifyUrgentSubmission(db, {
    caseId: awaiting.id,
    decidedBy: users.verifier.id,
    verified: true,
    reason: 'Mining activity confirmed; fund balance below the required budget.',
  })
  return { eviction, dispatched, awaiting }
}

async function main() {
  await truncateAll()
  const users = await createUsers()
  await seedLiveYamuna(users)
  await seedLiveCrisisCenter(users)
  await seedFundedShelter(users)
  await seedPipeline()
  await seedResponseTrack(users)
  console.log('Seeded PIL Promax dev database.')
  console.log('Sign-ins (password for all: seed-pass-123):')
  console.log('  admin@pilpromax.org  (ADMIN)')
  console.log('  lawyer@pilpromax.org (LAWYER)')
  console.log('  intern@pilpromax.org (INTERN)')
  console.log('  verifier@pilpromax.org (LAWYER/verifier)')
  console.log('  backer@example.com   (BACKER)')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
