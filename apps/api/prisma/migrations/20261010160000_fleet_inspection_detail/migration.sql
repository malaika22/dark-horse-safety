-- AlterTable
ALTER TABLE "FleetInspection" ADD COLUMN IF NOT EXISTS "serial" TEXT;
ALTER TABLE "FleetInspection" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "FleetInspection" ADD COLUMN IF NOT EXISTS "findingsSummary" TEXT;
ALTER TABLE "FleetInspection" ADD COLUMN IF NOT EXISTS "checklistItems" JSONB;
ALTER TABLE "FleetInspection" ADD COLUMN IF NOT EXISTS "photos" JSONB;
ALTER TABLE "FleetInspection" ADD COLUMN IF NOT EXISTS "actionsTaken" JSONB;
ALTER TABLE "FleetInspection" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "FleetInspection" ADD COLUMN IF NOT EXISTS "parentInspectionId" TEXT;
ALTER TABLE "FleetInspection" ADD COLUMN IF NOT EXISTS "reInspectionId" TEXT;
ALTER TABLE "FleetInspection" ADD COLUMN IF NOT EXISTS "reInspectionDueAt" TIMESTAMP(3);
ALTER TABLE "FleetInspection" ADD COLUMN IF NOT EXISTS "editReason" TEXT;
ALTER TABLE "FleetInspection" ADD COLUMN IF NOT EXISTS "editDetails" TEXT;
ALTER TABLE "FleetInspection" ADD COLUMN IF NOT EXISTS "editedBy" TEXT;
ALTER TABLE "FleetInspection" ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP(3);
ALTER TABLE "FleetInspection" ADD COLUMN IF NOT EXISTS "originalSnapshot" JSONB;

CREATE INDEX IF NOT EXISTS "FleetInspection_parentInspectionId_idx" ON "FleetInspection"("parentInspectionId");
