-- Unaccounted equipment list and KPI. Idempotent so a database that
-- already has the table (local db push) can still apply this migration.

DO $$ BEGIN
  CREATE TYPE "UnaccountedStatus" AS ENUM ('LOCATING', 'CHARGE_PENDING', 'OVERDUE', 'WRITTEN_OFF', 'RECOVERED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "UnaccountedAsset" (
    "id" TEXT NOT NULL,
    "assetLabel" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "replacementValue" DECIMAL(14,2) NOT NULL,
    "lastTruck" TEXT,
    "lastHolder" TEXT,
    "markedMissingAt" TIMESTAMP(3) NOT NULL,
    "locateDays" INTEGER NOT NULL DEFAULT 14,
    "status" "UnaccountedStatus" NOT NULL DEFAULT 'LOCATING',
    "chargeMethod" TEXT,
    "chargeReason" TEXT,
    "notifyTechnician" BOOLEAN NOT NULL DEFAULT false,
    "chargedAmount" DECIMAL(14,2),
    "history" JSONB,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnaccountedAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UnaccountedAsset_status_idx" ON "UnaccountedAsset"("status");
CREATE INDEX IF NOT EXISTS "UnaccountedAsset_archivedAt_idx" ON "UnaccountedAsset"("archivedAt");
CREATE INDEX IF NOT EXISTS "UnaccountedAsset_assetCode_idx" ON "UnaccountedAsset"("assetCode");
