-- NetSuite customer mapping sync metadata
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "netsuiteLastSyncAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "netsuiteLastResult" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "netsuiteSyncError" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "netsuiteAutoExport" BOOLEAN NOT NULL DEFAULT true;
