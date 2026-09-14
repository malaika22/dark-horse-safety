-- Quote to Work Order conversion fields + CONVERTED status
ALTER TYPE "CrmRecordStatus" ADD VALUE IF NOT EXISTS 'CONVERTED';

ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "convertedAt" TIMESTAMP(3);
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "conversionOverrideReason" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "convertedById" TEXT;

DO $$ BEGIN
  ALTER TABLE "Quote"
    ADD CONSTRAINT "Quote_convertedById_fkey"
    FOREIGN KEY ("convertedById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Quote_convertedById_idx" ON "Quote"("convertedById");
