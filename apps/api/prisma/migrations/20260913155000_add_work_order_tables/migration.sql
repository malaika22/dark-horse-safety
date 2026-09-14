-- Backfill tables that reached the schema via `db push` and were never captured
-- in a migration: QuoteAttachment, WorkOrder, CrmSyncState.
-- Ordered before 20260913160000_work_order_convert_snapshot, which ALTERs WorkOrder.
-- Every statement is idempotent so this replays cleanly on databases that already
-- have these tables from a local push.

-- CreateTable
CREATE TABLE IF NOT EXISTS "QuoteAttachment" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "storagePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WorkOrder" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT,
    "category" TEXT,
    "status" "CrmRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "serviceDate" TIMESTAMP(3),
    "scheduledStart" TEXT,
    "scheduledEnd" TEXT,
    "notes" TEXT,
    "amount" DECIMAL(14,2),
    "lineItemsSnapshot" JSONB,
    "crewAssignedAt" TIMESTAMP(3),
    "equipmentAssignedAt" TIMESTAMP(3),
    "formsCompletedAt" TIMESTAMP(3),
    "eligibilityVerifiedAt" TIMESTAMP(3),
    "customerId" TEXT NOT NULL,
    "locationId" TEXT,
    "quoteId" TEXT,
    "assignedRepId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CrmSyncState" (
    "id" TEXT NOT NULL DEFAULT 'crm',
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QuoteAttachment_quoteId_idx" ON "QuoteAttachment"("quoteId");
CREATE UNIQUE INDEX IF NOT EXISTS "WorkOrder_code_key" ON "WorkOrder"("code");
CREATE INDEX IF NOT EXISTS "WorkOrder_customerId_idx" ON "WorkOrder"("customerId");
CREATE INDEX IF NOT EXISTS "WorkOrder_locationId_idx" ON "WorkOrder"("locationId");
CREATE INDEX IF NOT EXISTS "WorkOrder_quoteId_idx" ON "WorkOrder"("quoteId");
CREATE INDEX IF NOT EXISTS "WorkOrder_status_idx" ON "WorkOrder"("status");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "QuoteAttachment" ADD CONSTRAINT "QuoteAttachment_quoteId_fkey"
    FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_quoteId_fkey"
    FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_assignedRepId_fkey"
    FOREIGN KEY ("assignedRepId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
