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
