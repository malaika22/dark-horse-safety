-- CreateTable
CREATE TABLE IF NOT EXISTS "NetSuiteItemMapping" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'SERVICE',
    "netsuiteItemId" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'OUTBOUND',
    "directionDetail" TEXT,
    "health" TEXT,
    "autoSync" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "lastResult" TEXT,
    "syncError" TEXT,
    "archivedAt" TIMESTAMP(3),
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NetSuiteItemMapping_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NetSuiteItemMapping_code_key" ON "NetSuiteItemMapping"("code");
CREATE INDEX IF NOT EXISTS "NetSuiteItemMapping_netsuiteItemId_idx" ON "NetSuiteItemMapping"("netsuiteItemId");
CREATE INDEX IF NOT EXISTS "NetSuiteItemMapping_category_idx" ON "NetSuiteItemMapping"("category");
CREATE INDEX IF NOT EXISTS "NetSuiteItemMapping_archivedAt_idx" ON "NetSuiteItemMapping"("archivedAt");
CREATE INDEX IF NOT EXISTS "NetSuiteItemMapping_ownerId_idx" ON "NetSuiteItemMapping"("ownerId");
CREATE INDEX IF NOT EXISTS "NetSuiteItemMapping_lastSyncAt_idx" ON "NetSuiteItemMapping"("lastSyncAt");

DO $$ BEGIN
  ALTER TABLE "NetSuiteItemMapping" ADD CONSTRAINT "NetSuiteItemMapping_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "NetSuiteItemDirectory" (
    "id" TEXT NOT NULL,
    "netsuiteItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'SERVICE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NetSuiteItemDirectory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NetSuiteItemDirectory_netsuiteItemId_key" ON "NetSuiteItemDirectory"("netsuiteItemId");
CREATE INDEX IF NOT EXISTS "NetSuiteItemDirectory_name_idx" ON "NetSuiteItemDirectory"("name");
