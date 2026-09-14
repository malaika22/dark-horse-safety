-- Payment cards + statement source + bonus deductions
DO $$ BEGIN
  CREATE TYPE "CardExceptionSource" AS ENUM ('STATEMENT', 'EXPENSE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "PaymentCard" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isCompanyCard" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentCard_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PaymentCard_active_idx" ON "PaymentCard"("active");
CREATE INDEX IF NOT EXISTS "PaymentCard_ownerId_idx" ON "PaymentCard"("ownerId");
CREATE INDEX IF NOT EXISTS "PaymentCard_archivedAt_idx" ON "PaymentCard"("archivedAt");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentCard_ownerId_fkey') THEN
    ALTER TABLE "PaymentCard" ADD CONSTRAINT "PaymentCard_ownerId_fkey"
      FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "CardReconciliation" ADD COLUMN IF NOT EXISTS "paymentCardId" TEXT;
CREATE INDEX IF NOT EXISTS "CardReconciliation_paymentCardId_idx" ON "CardReconciliation"("paymentCardId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CardReconciliation_paymentCardId_fkey') THEN
    ALTER TABLE "CardReconciliation" ADD CONSTRAINT "CardReconciliation_paymentCardId_fkey"
      FOREIGN KEY ("paymentCardId") REFERENCES "PaymentCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "CardReconException" ADD COLUMN IF NOT EXISTS "source" "CardExceptionSource" NOT NULL DEFAULT 'EXPENSE';
CREATE INDEX IF NOT EXISTS "CardReconException_source_idx" ON "CardReconException"("source");

UPDATE "CardReconException" SET "source" = 'STATEMENT' WHERE "kind" = 'UNMATCHED_CHARGE' OR "kind" = 'MATCHED';

CREATE TABLE IF NOT EXISTS "BonusDeduction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "quarterLabel" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reconciliationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BonusDeduction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BonusDeduction_userId_idx" ON "BonusDeduction"("userId");
CREATE INDEX IF NOT EXISTS "BonusDeduction_reconciliationId_idx" ON "BonusDeduction"("reconciliationId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BonusDeduction_userId_fkey') THEN
    ALTER TABLE "BonusDeduction" ADD CONSTRAINT "BonusDeduction_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BonusDeduction_reconciliationId_fkey') THEN
    ALTER TABLE "BonusDeduction" ADD CONSTRAINT "BonusDeduction_reconciliationId_fkey"
      FOREIGN KEY ("reconciliationId") REFERENCES "CardReconciliation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
