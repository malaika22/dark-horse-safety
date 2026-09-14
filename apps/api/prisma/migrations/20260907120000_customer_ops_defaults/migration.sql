-- AlterTable
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "minBillableBlock" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "autoFlagNoShow" TEXT;
