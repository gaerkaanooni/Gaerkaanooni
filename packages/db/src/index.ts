import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export { CaseRepository, type CreateSubmissionInput } from './repositories/case'
export {
  createReferral,
  listReferrals,
  updateReferralStatus,
  type ReferralRow,
  type CreateReferralInput,
} from './repositories/referrals'
export {
  createDocument,
  listDocuments,
  getDocument,
  deleteDocument,
  type CaseDocumentRow,
  type CreateDocumentInput,
} from './repositories/documents'
export {
  publishCampaign,
  screenCase,
  submitCampaign,
  type PublishCampaignInput,
  type ScreenCaseInput,
  type SubmitCampaignInput,
} from './services/case-flows'
export {
  backCase,
  captureContribution,
  finalizeFundedCampaign,
  followCase,
  markExpired,
  refundContribution,
  refundExpiredCampaign,
  type BackCaseInput,
  type CaptureContributionInput,
} from './services/contributions'
export {
  dispatchUrgentCase,
  publishResponsePage,
  submitUrgent,
  verifyUrgentSubmission,
  type SubmitUrgentInput,
  type VerifyUrgentInput,
} from './services/response-track'
export { getResponseFundBalance, seedResponseFund } from './services/finance'
export { postCaseUpdate, type PostCaseUpdateInput } from './services/updates'
export { getPublicCampaign, listPublicCampaigns, type PublicCampaign, type PublicCaseUpdate } from './services/queries'
export {
  getCaseList,
  getFinancialSummary,
  getVolunteerDirectory,
  type CaseListRow,
  type FinancialSummary,
  type VolunteerRow,
} from './services/dashboard'
export { registerUser, setRole, verifyCredentials, type RegisterUserInput } from './services/auth'
export { getAnalytics, type Analytics, type CategoryCount, type WeeklyContribution } from './services/analytics'
