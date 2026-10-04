-- Align leftover stub tables with the live Prisma models.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'FormCorrectionRequest'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'FormCorrectionRequest' AND column_name = 'formTitle'
  ) THEN
    DROP TABLE "FormCorrectionRequest" CASCADE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'AdditionalFormRequest'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'AdditionalFormRequest' AND column_name = 'formRequested'
  ) THEN
    DROP TABLE "AdditionalFormRequest" CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  CREATE TYPE "FormCorrectionStatus" AS ENUM ('OPEN', 'RESUBMITTED', 'APPROVED', 'REJECTED', 'NEEDS_INFO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AdditionalFormStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'NEEDS_INFO', 'FORM_ADDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AdditionalFormUrgency" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "FormCorrectionRequest" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "formLabel" TEXT NOT NULL,
    "formTitle" TEXT NOT NULL,
    "workOrderId" TEXT,
    "customerName" TEXT NOT NULL,
    "locationLabel" TEXT,
    "reasonShort" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestedByStatus" TEXT,
    "status" "FormCorrectionStatus" NOT NULL DEFAULT 'OPEN',
    "originalStatus" TEXT NOT NULL DEFAULT 'LOCKED',
    "version" TEXT NOT NULL DEFAULT 'V1',
    "issueFlagged" TEXT NOT NULL,
    "correctionInstruction" TEXT NOT NULL,
    "resubmission" JSONB,
    "rule" TEXT NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormCorrectionRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AdditionalFormRequest" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "workOrderId" TEXT,
    "customerName" TEXT NOT NULL,
    "locationLabel" TEXT NOT NULL,
    "technicianName" TEXT NOT NULL,
    "formRequested" TEXT NOT NULL,
    "reasonShort" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "urgency" "AdditionalFormUrgency" NOT NULL DEFAULT 'MEDIUM',
    "status" "AdditionalFormStatus" NOT NULL DEFAULT 'PENDING',
    "reviewer" TEXT NOT NULL DEFAULT 'UNASSIGNED',
    "history" JSONB NOT NULL,
    "rule" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdditionalFormRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FormCorrectionRequest_code_key" ON "FormCorrectionRequest"("code");
CREATE INDEX IF NOT EXISTS "FormCorrectionRequest_workOrderId_idx" ON "FormCorrectionRequest"("workOrderId");
CREATE INDEX IF NOT EXISTS "FormCorrectionRequest_status_idx" ON "FormCorrectionRequest"("status");
CREATE INDEX IF NOT EXISTS "FormCorrectionRequest_createdAt_idx" ON "FormCorrectionRequest"("createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "AdditionalFormRequest_code_key" ON "AdditionalFormRequest"("code");
CREATE INDEX IF NOT EXISTS "AdditionalFormRequest_workOrderId_idx" ON "AdditionalFormRequest"("workOrderId");
CREATE INDEX IF NOT EXISTS "AdditionalFormRequest_status_idx" ON "AdditionalFormRequest"("status");
CREATE INDEX IF NOT EXISTS "AdditionalFormRequest_urgency_idx" ON "AdditionalFormRequest"("urgency");
CREATE INDEX IF NOT EXISTS "AdditionalFormRequest_createdAt_idx" ON "AdditionalFormRequest"("createdAt");

DO $$ BEGIN
  ALTER TABLE "FormCorrectionRequest" ADD CONSTRAINT "FormCorrectionRequest_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AdditionalFormRequest" ADD CONSTRAINT "AdditionalFormRequest_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
