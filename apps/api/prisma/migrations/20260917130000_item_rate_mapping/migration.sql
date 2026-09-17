-- AlterTable
ALTER TABLE "NetSuiteItemDirectory" ADD COLUMN IF NOT EXISTS "rate" DECIMAL(14,2);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ItemRateMapping" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dhsRate" DECIMAL(14,2) NOT NULL,
    "netsuiteItemId" TEXT,
    "netsuiteRate" DECIMAL(14,2),
    "unit" TEXT,
    "duration" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveDetail" TEXT,
    "autoSync" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemRateMapping_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ItemRateMapping_code_key" ON "ItemRateMapping"("code");
CREATE INDEX IF NOT EXISTS "ItemRateMapping_netsuiteItemId_idx" ON "ItemRateMapping"("netsuiteItemId");
CREATE INDEX IF NOT EXISTS "ItemRateMapping_archivedAt_idx" ON "ItemRateMapping"("archivedAt");
CREATE INDEX IF NOT EXISTS "ItemRateMapping_ownerId_idx" ON "ItemRateMapping"("ownerId");
CREATE INDEX IF NOT EXISTS "ItemRateMapping_effectiveFrom_idx" ON "ItemRateMapping"("effectiveFrom");

DO $$ BEGIN
  ALTER TABLE "ItemRateMapping" ADD CONSTRAINT "ItemRateMapping_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
