-- Full Add Requirement form fields
ALTER TABLE "CustomerRequirement" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "CustomerRequirement" ADD COLUMN IF NOT EXISTS "issuingBody" TEXT;
ALTER TABLE "CustomerRequirement" ADD COLUMN IF NOT EXISTS "minimumGrade" TEXT;
ALTER TABLE "CustomerRequirement" ADD COLUMN IF NOT EXISTS "appliesToRoles" JSONB;
ALTER TABLE "CustomerRequirement" ADD COLUMN IF NOT EXISTS "evidenceType" TEXT;
ALTER TABLE "CustomerRequirement" ADD COLUMN IF NOT EXISTS "verificationMethod" TEXT;
ALTER TABLE "CustomerRequirement" ADD COLUMN IF NOT EXISTS "overrideRoles" JSONB;
ALTER TABLE "CustomerRequirement" ADD COLUMN IF NOT EXISTS "requireOverrideReason" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CustomerRequirement" ADD COLUMN IF NOT EXISTS "rolloutMode" TEXT;
ALTER TABLE "CustomerRequirement" ADD COLUMN IF NOT EXISTS "effectiveFrom" TIMESTAMP(3);
ALTER TABLE "CustomerRequirement" ADD COLUMN IF NOT EXISTS "renewalLeadDays" INTEGER;
ALTER TABLE "CustomerRequirement" ADD COLUMN IF NOT EXISTS "validityPeriod" TEXT;
ALTER TABLE "CustomerRequirement" ADD COLUMN IF NOT EXISTS "autoCheckable" BOOLEAN NOT NULL DEFAULT true;
