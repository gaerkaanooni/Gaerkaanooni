-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Category" ADD VALUE 'HOUSING';
ALTER TYPE "Category" ADD VALUE 'FAMILY';
ALTER TYPE "Category" ADD VALUE 'DISABILITY';
ALTER TYPE "Category" ADD VALUE 'DISCRIMINATION';
ALTER TYPE "Category" ADD VALUE 'CRIMINAL_BAIL';
ALTER TYPE "Category" ADD VALUE 'DEBT_MONEY';
ALTER TYPE "Category" ADD VALUE 'HEALTH';
ALTER TYPE "Category" ADD VALUE 'EDUCATION';
ALTER TYPE "Category" ADD VALUE 'SOCIAL_SECURITY';
ALTER TYPE "Category" ADD VALUE 'LAND';
