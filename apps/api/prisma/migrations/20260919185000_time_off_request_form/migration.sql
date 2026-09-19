-- AlterTable
ALTER TABLE "TimeOffRequest" ADD COLUMN IF NOT EXISTS "durationMode" TEXT NOT NULL DEFAULT 'ALL_DAY';
ALTER TABLE "TimeOffRequest" ADD COLUMN IF NOT EXISTS "partialHours" DECIMAL(10,1);
ALTER TABLE "TimeOffRequest" ADD COLUMN IF NOT EXISTS "coveragePersonId" TEXT;
ALTER TABLE "TimeOffRequest" ADD COLUMN IF NOT EXISTS "coveragePersonName" TEXT;
ALTER TABLE "TimeOffRequest" ADD COLUMN IF NOT EXISTS "allowOverride" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TimeOffRequest" ADD COLUMN IF NOT EXISTS "overrideRoles" JSONB;
ALTER TABLE "TimeOffRequest" ADD COLUMN IF NOT EXISTS "requireOverrideReason" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TimeOffRequest" ADD COLUMN IF NOT EXISTS "notifySupervisor" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "TimeOffRequest" ADD COLUMN IF NOT EXISTS "attachments" JSONB;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TimeOffRequest_coveragePersonId_idx" ON "TimeOffRequest"("coveragePersonId");
