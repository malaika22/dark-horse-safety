ALTER TABLE "TimeEditRequest" ADD COLUMN IF NOT EXISTS "lockedCycle" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TimeEditRequest" ADD COLUMN IF NOT EXISTS "payrollCycleLabel" TEXT;
ALTER TABLE "TimeEditRequest" ADD COLUMN IF NOT EXISTS "cycleClosedLabel" TEXT;
ALTER TABLE "TimeEditRequest" ADD COLUMN IF NOT EXISTS "dollarDelta" DECIMAL(10,2);
ALTER TABLE "TimeEditRequest" ADD COLUMN IF NOT EXISTS "dollarDeltaLabel" TEXT;
ALTER TABLE "TimeEditRequest" ADD COLUMN IF NOT EXISTS "auditWarning" TEXT;
ALTER TABLE "TimeEditRequest" ADD COLUMN IF NOT EXISTS "offCycleRunLabel" TEXT;
ALTER TABLE "TimeEditRequest" ADD COLUMN IF NOT EXISTS "overrideByName" TEXT;
ALTER TABLE "TimeEditRequest" ADD COLUMN IF NOT EXISTS "overrideAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "TimeEditRequest_lockedCycle_idx" ON "TimeEditRequest"("lockedCycle");
