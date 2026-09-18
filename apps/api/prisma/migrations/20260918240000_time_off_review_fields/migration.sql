ALTER TABLE "TimeOffRequest" ADD COLUMN IF NOT EXISTS "onCallDates" JSONB;
ALTER TABLE "TimeOffRequest" ADD COLUMN IF NOT EXISTS "assignedJobs" JSONB;
CREATE INDEX IF NOT EXISTS "TimeOffRequest_endDate_idx" ON "TimeOffRequest"("endDate");
