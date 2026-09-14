-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "CardReconStatus" AS ENUM ('OPEN', 'FINISHED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "CardExceptionKind" AS ENUM ('MATCHED', 'MISSING_RECEIPT', 'UNMATCHED_CHARGE', 'UNMATCHED_EXPENSE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "CardExceptionResolution" AS ENUM ('NONE', 'RECEIPT_REQUESTED', 'WAIVED', 'EXPENSE_LOGGED', 'PERSONAL', 'DISPUTED', 'DELETED', 'MATCHED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "CardReconciliation" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "cardLabel" TEXT NOT NULL DEFAULT 'AMEX ····4021',
    "statementLabel" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "statementTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "CardReconStatus" NOT NULL DEFAULT 'OPEN',
    "forceFinished" BOOLEAN NOT NULL DEFAULT false,
    "finishedAt" TIMESTAMP(3),
    "customerId" TEXT NOT NULL,
    "cardholderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CardReconciliation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CardReconciliation_code_key" ON "CardReconciliation"("code");
CREATE INDEX IF NOT EXISTS "CardReconciliation_customerId_idx" ON "CardReconciliation"("customerId");
CREATE INDEX IF NOT EXISTS "CardReconciliation_status_idx" ON "CardReconciliation"("status");
CREATE INDEX IF NOT EXISTS "CardReconciliation_periodStart_idx" ON "CardReconciliation"("periodStart");
CREATE INDEX IF NOT EXISTS "CardReconciliation_cardholderId_idx" ON "CardReconciliation"("cardholderId");

CREATE TABLE IF NOT EXISTS "CardReconException" (
    "id" TEXT NOT NULL,
    "reconciliationId" TEXT NOT NULL,
    "kind" "CardExceptionKind" NOT NULL,
    "exceptionDate" TIMESTAMP(3) NOT NULL,
    "merchant" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolution" "CardExceptionResolution" NOT NULL DEFAULT 'NONE',
    "waiveReason" TEXT,
    "receiptRequestedAt" TIMESTAMP(3),
    "expenseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CardReconException_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CardReconException_reconciliationId_idx" ON "CardReconException"("reconciliationId");
CREATE INDEX IF NOT EXISTS "CardReconException_expenseId_idx" ON "CardReconException"("expenseId");
CREATE INDEX IF NOT EXISTS "CardReconException_kind_idx" ON "CardReconException"("kind");
CREATE INDEX IF NOT EXISTS "CardReconException_resolved_idx" ON "CardReconException"("resolved");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CardReconciliation_customerId_fkey') THEN
    ALTER TABLE "CardReconciliation" ADD CONSTRAINT "CardReconciliation_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CardReconciliation_cardholderId_fkey') THEN
    ALTER TABLE "CardReconciliation" ADD CONSTRAINT "CardReconciliation_cardholderId_fkey"
      FOREIGN KEY ("cardholderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CardReconException_reconciliationId_fkey') THEN
    ALTER TABLE "CardReconException" ADD CONSTRAINT "CardReconException_reconciliationId_fkey"
      FOREIGN KEY ("reconciliationId") REFERENCES "CardReconciliation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CardReconException_expenseId_fkey') THEN
    ALTER TABLE "CardReconException" ADD CONSTRAINT "CardReconException_expenseId_fkey"
      FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
