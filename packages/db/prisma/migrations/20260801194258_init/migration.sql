-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'INTERN', 'LAWYER', 'BACKER', 'PUBLIC');

-- CreateEnum
CREATE TYPE "VolunteerRole" AS ENUM ('LAWYER', 'VERIFIER', 'CASE_MANAGER', 'COMMS');

-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('AVAILABLE', 'BUSY', 'AWAY');

-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('FUNDED', 'DISPATCHED');

-- CreateEnum
CREATE TYPE "Stage" AS ENUM ('SUBMITTED', 'SCREENING', 'APPROVED', 'REJECTED', 'LIVE', 'FUNDED', 'EXPIRED', 'AWAITING_FUNDS', 'DISPATCHED', 'ASSIGNED', 'FILED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('CIVIL_LIBERTIES', 'ENVIRONMENT', 'LABOR', 'CONSUMER', 'OTHER');

-- CreateEnum
CREATE TYPE "Track" AS ENUM ('CAMPAIGN', 'RESPONSE');

-- CreateEnum
CREATE TYPE "BackerKind" AS ENUM ('FOLLOWER', 'BACKER');

-- CreateEnum
CREATE TYPE "ContributionStatus" AS ENUM ('PENDING', 'CAPTURED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "AssignmentKind" AS ENUM ('PRIMARY', 'SUPPORT');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'RELEASED');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('CONTRIBUTION', 'REFUND', 'RESPONSE_DRAW', 'REPLENISHMENT', 'FEE', 'DISBURSEMENT', 'SURPLUS_SWEEP');

-- CreateEnum
CREATE TYPE "DisbursementCategory" AS ENUM ('COURT_FEE', 'LAWYER_DISBURSEMENT', 'FILING', 'MISC');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'PUBLIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Volunteer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "VolunteerRole" NOT NULL,
    "skills" TEXT[],
    "region" TEXT,
    "availability" "Availability" NOT NULL DEFAULT 'AVAILABLE',
    "capacityLimit" INTEGER NOT NULL DEFAULT 5,
    "hoursContributed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Volunteer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "entryType" "EntryType" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "region" TEXT,
    "stage" "Stage" NOT NULL,
    "goalAmountPaise" INTEGER NOT NULL,
    "deadlineAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "activeSinceAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "track" "Track" NOT NULL,
    "whatHappened" TEXT NOT NULL,
    "where" TEXT,
    "when" TEXT,
    "applicantName" TEXT,
    "contact" TEXT,
    "onBehalfOf" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Screening" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "completenessPassed" BOOLEAN NOT NULL DEFAULT false,
    "duplicateOfCaseId" TEXT,
    "isEligible" BOOLEAN,
    "reason" TEXT,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Screening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Backer" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "kind" "BackerKind" NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Backer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "backerId" TEXT,
    "grossAmountPaise" INTEGER NOT NULL,
    "totalFeePaise" INTEGER NOT NULL DEFAULT 0,
    "gatewayFeePaise" INTEGER NOT NULL DEFAULT 0,
    "platformFeePaise" INTEGER NOT NULL DEFAULT 0,
    "netToCasePaise" INTEGER NOT NULL,
    "status" "ContributionStatus" NOT NULL DEFAULT 'PENDING',
    "razorpayOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseUpdate" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "authorId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "volunteerId" TEXT NOT NULL,
    "kind" "AssignmentKind" NOT NULL DEFAULT 'PRIMARY',
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "type" "LedgerType" NOT NULL,
    "caseId" TEXT,
    "amountPaise" INTEGER NOT NULL,
    "category" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disbursement" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "category" "DisbursementCategory" NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "signoffRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Disbursement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "caseId" TEXT,
    "amountPaise" INTEGER,
    "reason" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Volunteer_userId_key" ON "Volunteer"("userId");

-- CreateIndex
CREATE INDEX "Case_stage_idx" ON "Case"("stage");

-- CreateIndex
CREATE INDEX "Case_entryType_idx" ON "Case"("entryType");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_caseId_key" ON "Submission"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "Screening_caseId_key" ON "Screening"("caseId");

-- CreateIndex
CREATE INDEX "Backer_caseId_idx" ON "Backer"("caseId");

-- CreateIndex
CREATE INDEX "Contribution_caseId_idx" ON "Contribution"("caseId");

-- CreateIndex
CREATE INDEX "Contribution_status_idx" ON "Contribution"("status");

-- CreateIndex
CREATE INDEX "CaseUpdate_caseId_idx" ON "CaseUpdate"("caseId");

-- CreateIndex
CREATE INDEX "Assignment_volunteerId_idx" ON "Assignment"("volunteerId");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_caseId_volunteerId_key" ON "Assignment"("caseId", "volunteerId");

-- CreateIndex
CREATE INDEX "LedgerEntry_caseId_idx" ON "LedgerEntry"("caseId");

-- CreateIndex
CREATE INDEX "Disbursement_caseId_idx" ON "Disbursement"("caseId");

-- CreateIndex
CREATE INDEX "AuditLog_caseId_createdAt_idx" ON "AuditLog"("caseId", "createdAt");

-- AddForeignKey
ALTER TABLE "Volunteer" ADD CONSTRAINT "Volunteer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screening" ADD CONSTRAINT "Screening_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Backer" ADD CONSTRAINT "Backer_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseUpdate" ADD CONSTRAINT "CaseUpdate_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "Volunteer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
