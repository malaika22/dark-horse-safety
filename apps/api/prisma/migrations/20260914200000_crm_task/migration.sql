-- AlterTable
ALTER TABLE "SalesActivity" ADD COLUMN IF NOT EXISTS "nextAction" TEXT;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "CrmTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "CrmTask" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "priority" "CrmTaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "CrmRecordStatus" NOT NULL DEFAULT 'OPEN',
    "dueAt" TIMESTAMP(3),
    "reminder" TEXT,
    "notes" TEXT,
    "relatedLabel" TEXT,
    "attachmentUrl" TEXT,
    "attachmentFileName" TEXT,
    "archivedAt" TIMESTAMP(3),
    "salesActivityId" TEXT,
    "customerId" TEXT,
    "quoteId" TEXT,
    "assigneeId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CrmTask_code_key" ON "CrmTask"("code");
CREATE INDEX IF NOT EXISTS "CrmTask_salesActivityId_idx" ON "CrmTask"("salesActivityId");
CREATE INDEX IF NOT EXISTS "CrmTask_customerId_idx" ON "CrmTask"("customerId");
CREATE INDEX IF NOT EXISTS "CrmTask_quoteId_idx" ON "CrmTask"("quoteId");
CREATE INDEX IF NOT EXISTS "CrmTask_assigneeId_idx" ON "CrmTask"("assigneeId");
CREATE INDEX IF NOT EXISTS "CrmTask_dueAt_idx" ON "CrmTask"("dueAt");
CREATE INDEX IF NOT EXISTS "CrmTask_status_idx" ON "CrmTask"("status");
CREATE INDEX IF NOT EXISTS "CrmTask_archivedAt_idx" ON "CrmTask"("archivedAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "CrmTask" ADD CONSTRAINT "CrmTask_salesActivityId_fkey" FOREIGN KEY ("salesActivityId") REFERENCES "SalesActivity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "CrmTask" ADD CONSTRAINT "CrmTask_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "CrmTask" ADD CONSTRAINT "CrmTask_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "CrmTask" ADD CONSTRAINT "CrmTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "CrmTask" ADD CONSTRAINT "CrmTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
