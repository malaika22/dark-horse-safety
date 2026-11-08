import { PrismaService } from '../../prisma/prisma.service';

let ready: Promise<void> | null = null;

/** Create UnaccountedAsset when a deploy has not applied the migration yet. */
export function ensureUnaccountedTable(prisma: PrismaService) {
  if (!ready) {
    ready = createUnaccountedTable(prisma).catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

async function createUnaccountedTable(prisma: PrismaService) {
  try {
    await prisma.$executeRawUnsafe(
      `CREATE TYPE "UnaccountedStatus" AS ENUM ('LOCATING', 'CHARGE_PENDING', 'OVERDUE', 'WRITTEN_OFF', 'RECOVERED')`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/already exists|duplicate_object/i.test(message)) throw err;
  }
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "UnaccountedAsset" (
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
    )`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "UnaccountedAsset_status_idx" ON "UnaccountedAsset"("status")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "UnaccountedAsset_archivedAt_idx" ON "UnaccountedAsset"("archivedAt")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "UnaccountedAsset_assetCode_idx" ON "UnaccountedAsset"("assetCode")`,
  );
}
