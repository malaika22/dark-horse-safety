CREATE TABLE IF NOT EXISTS "FleetLocation" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'YARD',
  "address" TEXT,
  "city" TEXT,
  "state" TEXT,
  "latitude" DECIMAL(10,6),
  "longitude" DECIMAL(10,6),
  "responsibleName" TEXT,
  "accessHours" TEXT,
  "maxCapacity" INTEGER,
  "bayCount" INTEGER,
  "emergencyContact" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FleetLocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FleetLocation_status_idx" ON "FleetLocation"("status");
CREATE INDEX IF NOT EXISTS "FleetLocation_archivedAt_idx" ON "FleetLocation"("archivedAt");
CREATE INDEX IF NOT EXISTS "FleetLocation_name_idx" ON "FleetLocation"("name");
