-- CreateEnum
CREATE TYPE "LawyerApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "LawyerApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "barCouncilId" TEXT NOT NULL,
    "yearsPractice" INTEGER NOT NULL,
    "skills" TEXT[],
    "region" TEXT,
    "capacityLimit" INTEGER NOT NULL DEFAULT 2,
    "motivation" TEXT,
    "status" "LawyerApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "decisionReason" TEXT,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LawyerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LawyerApplication_email_key" ON "LawyerApplication"("email");

-- CreateIndex
CREATE INDEX "LawyerApplication_status_createdAt_idx" ON "LawyerApplication"("status", "createdAt");
