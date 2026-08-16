-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('NEW', 'CONTACTED', 'ASSISTED', 'CLOSED');

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referredFor" TEXT NOT NULL,
    "category" "Category",
    "matter" TEXT NOT NULL,
    "region" TEXT,
    "contact" TEXT,
    "referrer" TEXT,
    "referrerContact" TEXT,
    "contactConsented" BOOLEAN NOT NULL DEFAULT false,
    "status" "ReferralStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Referral_status_idx" ON "Referral"("status");

-- CreateIndex
CREATE INDEX "Referral_createdAt_idx" ON "Referral"("createdAt");
