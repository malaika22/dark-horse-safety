-- Log Activity form fields (Figma)
ALTER TABLE "SalesActivity" ADD COLUMN IF NOT EXISTS "createFollowUpTask" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SalesActivity" ADD COLUMN IF NOT EXISTS "logExpense" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SalesActivity" ADD COLUMN IF NOT EXISTS "attendees" JSONB;
ALTER TABLE "SalesActivity" ADD COLUMN IF NOT EXISTS "locationId" TEXT;

CREATE INDEX IF NOT EXISTS "SalesActivity_locationId_idx" ON "SalesActivity"("locationId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SalesActivity_locationId_fkey'
  ) THEN
    ALTER TABLE "SalesActivity"
      ADD CONSTRAINT "SalesActivity_locationId_fkey"
      FOREIGN KEY ("locationId") REFERENCES "Location"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
