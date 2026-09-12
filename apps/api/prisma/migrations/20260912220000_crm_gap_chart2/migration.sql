-- Quote scheduled send + requirement evidence URL
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "scheduledSendAt" TIMESTAMP(3);
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "scheduledTo" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "scheduledSubject" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "scheduledMessage" TEXT;

CREATE INDEX IF NOT EXISTS "Quote_scheduledSendAt_idx" ON "Quote"("scheduledSendAt");

ALTER TABLE "CustomerRequirement" ADD COLUMN IF NOT EXISTS "evidenceUrl" TEXT;
