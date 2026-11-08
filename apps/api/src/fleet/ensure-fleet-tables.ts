import { PrismaService } from '../prisma/prisma.service';
import { ensureUnaccountedTable } from './unaccounted/ensure-unaccounted-table';

let ready: Promise<void> | null = null;

/** Create fleet tables that older deploys never migrated. */
export function ensureFleetTables(prisma: PrismaService) {
  if (!ready) {
    ready = createFleetTables(prisma).catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

async function createFleetTables(prisma: PrismaService) {
  await ensureUnaccountedTable(prisma);
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "FleetLocation" (
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
    )`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "FleetLocation_status_idx" ON "FleetLocation"("status")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "FleetLocation_archivedAt_idx" ON "FleetLocation"("archivedAt")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "FleetLocation_name_idx" ON "FleetLocation"("name")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "FleetTruckProfile" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "documents" JSONB,
      "inventory" JSONB,
      "audit" JSONB,
      "movements" JSONB,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "FleetTruckProfile_pkey" PRIMARY KEY ("id")
    )`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "FleetTruckProfile_name_key" ON "FleetTruckProfile"("name")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "FleetAssetProfile" (
      "id" TEXT NOT NULL,
      "assetCode" TEXT NOT NULL,
      "profile" JSONB NOT NULL DEFAULT '{}',
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "FleetAssetProfile_pkey" PRIMARY KEY ("id")
    )`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "FleetAssetProfile_assetCode_key" ON "FleetAssetProfile"("assetCode")`,
  );
}
