-- AlterTable
ALTER TABLE "SalesTicket" ADD COLUMN IF NOT EXISTS "locationLabel" TEXT;
ALTER TABLE "SalesTicket" ADD COLUMN IF NOT EXISTS "jobDateLabel" TEXT;
ALTER TABLE "SalesTicket" ADD COLUMN IF NOT EXISTS "workedHours" DECIMAL(10,1);
ALTER TABLE "SalesTicket" ADD COLUMN IF NOT EXISTS "billedHours" DECIMAL(10,1);
ALTER TABLE "SalesTicket" ADD COLUMN IF NOT EXISTS "deltaHours" DECIMAL(10,1);
ALTER TABLE "SalesTicket" ADD COLUMN IF NOT EXISTS "amount" DECIMAL(14,2);
ALTER TABLE "SalesTicket" ADD COLUMN IF NOT EXISTS "reconciliation" TEXT;
ALTER TABLE "SalesTicket" ADD COLUMN IF NOT EXISTS "issueLabel" TEXT;
ALTER TABLE "SalesTicket" ADD COLUMN IF NOT EXISTS "approvalStatus" TEXT;
ALTER TABLE "SalesTicket" ADD COLUMN IF NOT EXISTS "netsuiteStatus" TEXT;
ALTER TABLE "SalesTicket" ADD COLUMN IF NOT EXISTS "techStatus" TEXT;
ALTER TABLE "SalesTicket" ADD COLUMN IF NOT EXISTS "techExtraCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SalesTicket" ADD COLUMN IF NOT EXISTS "stMissing" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SalesTicket" ADD COLUMN IF NOT EXISTS "billingFlag" TEXT;
ALTER TABLE "SalesTicket" ADD COLUMN IF NOT EXISTS "workflowStep" TEXT;
ALTER TABLE "SalesTicket" ADD COLUMN IF NOT EXISTS "detailPacket" JSONB;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SalesTicket_approvalStatus_idx" ON "SalesTicket"("approvalStatus");
CREATE INDEX IF NOT EXISTS "SalesTicket_reconciliation_idx" ON "SalesTicket"("reconciliation");