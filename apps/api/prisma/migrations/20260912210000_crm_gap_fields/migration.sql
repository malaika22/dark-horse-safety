-- Contact profile fields + location site contact FK + pay cycles
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "linkedIn" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "timeZone" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "doNotContact" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "howWeMet" TEXT;

ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "siteContactId" TEXT;

CREATE TABLE IF NOT EXISTS "PayCycle" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayCycle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PayCycle_code_key" ON "PayCycle"("code");
CREATE INDEX IF NOT EXISTS "PayCycle_startDate_idx" ON "PayCycle"("startDate");
CREATE INDEX IF NOT EXISTS "PayCycle_cycleNumber_idx" ON "PayCycle"("cycleNumber");
CREATE INDEX IF NOT EXISTS "Location_siteContactId_idx" ON "Location"("siteContactId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Location_siteContactId_fkey'
  ) THEN
    ALTER TABLE "Location"
      ADD CONSTRAINT "Location_siteContactId_fkey"
      FOREIGN KEY ("siteContactId") REFERENCES "Contact"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
