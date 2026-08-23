-- CreateEnum
CREATE TYPE "AssignmentRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- CreateTable
CREATE TABLE "AssignmentRequest" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "volunteerId" TEXT NOT NULL,
    "status" "AssignmentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "decisionReason" TEXT,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssignmentRequest_status_createdAt_idx" ON "AssignmentRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AssignmentRequest_volunteerId_idx" ON "AssignmentRequest"("volunteerId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentRequest_caseId_volunteerId_key" ON "AssignmentRequest"("caseId", "volunteerId");

-- AddForeignKey
ALTER TABLE "AssignmentRequest" ADD CONSTRAINT "AssignmentRequest_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentRequest" ADD CONSTRAINT "AssignmentRequest_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "Volunteer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
