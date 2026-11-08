-- Tables used by trucks, locations, asset profiles, and fleet extras.
-- Idempotent so a database that already has them can still apply this migration.

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

CREATE TABLE IF NOT EXISTS "FleetTruckProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documents" JSONB,
    "inventory" JSONB,
    "audit" JSONB,
    "movements" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FleetTruckProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FleetTruckProfile_name_key" ON "FleetTruckProfile"("name");

CREATE TABLE IF NOT EXISTS "FleetAssetProfile" (
    "id" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "profile" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FleetAssetProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FleetAssetProfile_assetCode_key" ON "FleetAssetProfile"("assetCode");

CREATE TABLE IF NOT EXISTS "FleetCalibrationExtra" (
    "calibrationId" TEXT NOT NULL,
    extra JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FleetCalibrationExtra_pkey" PRIMARY KEY ("calibrationId")
);

CREATE TABLE IF NOT EXISTS "FleetRepairDetail" (
    "repairId" TEXT NOT NULL,
    detail JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FleetRepairDetail_pkey" PRIMARY KEY ("repairId")
);

CREATE TABLE IF NOT EXISTS "FleetCustomerOwnedExtra" (
    "equipmentId" TEXT NOT NULL,
    extra JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FleetCustomerOwnedExtra_pkey" PRIMARY KEY ("equipmentId")
);
