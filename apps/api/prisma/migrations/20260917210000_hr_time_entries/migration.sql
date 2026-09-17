-- AlterEnum
ALTER TYPE "SavedViewScope" ADD VALUE IF NOT EXISTS 'TIME_ENTRIES';

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "TimeEntryStatus" AS ENUM ('APPROVED', 'PENDING', 'REJECTED', 'MISSING_CO', 'LOCKED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TimeEntryCategory" AS ENUM ('REGULAR', 'OVERTIME', 'NON_BILLABLE', 'ON_JOB_TRAINING');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TimeEntrySource" AS ENUM ('MOBILE', 'IMPORTED', 'CORRECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "TimeEntry" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "workDate" DATE NOT NULL,
    "cycleLabel" TEXT NOT NULL,
    "workOrderShort" TEXT,
    "workOrderCode" TEXT,
    "category" "TimeEntryCategory" NOT NULL DEFAULT 'REGULAR',
    "clockIn" TEXT,
    "clockOut" TEXT,
    "source" "TimeEntrySource" NOT NULL DEFAULT 'MOBILE',
    "hours" DECIMAL(10,1) NOT NULL DEFAULT 0,
    "workHours" DECIMAL(10,1),
    "travelHours" DECIMAL(10,1),
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "gpsFlagged" BOOLEAN NOT NULL DEFAULT false,
    "gpsLabel" TEXT NOT NULL DEFAULT 'CLEAR',
    "status" "TimeEntryStatus" NOT NULL DEFAULT 'PENDING',
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "correctionRequested" BOOLEAN NOT NULL DEFAULT false,
    "notes" JSONB,
    "gpsTrail" JSONB,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TimeEntry_employeeId_idx" ON "TimeEntry"("employeeId");
CREATE INDEX IF NOT EXISTS "TimeEntry_workDate_idx" ON "TimeEntry"("workDate");
CREATE INDEX IF NOT EXISTS "TimeEntry_status_idx" ON "TimeEntry"("status");
CREATE INDEX IF NOT EXISTS "TimeEntry_category_idx" ON "TimeEntry"("category");
CREATE INDEX IF NOT EXISTS "TimeEntry_gpsFlagged_idx" ON "TimeEntry"("gpsFlagged");
CREATE INDEX IF NOT EXISTS "TimeEntry_locked_idx" ON "TimeEntry"("locked");
CREATE INDEX IF NOT EXISTS "TimeEntry_archivedAt_idx" ON "TimeEntry"("archivedAt");

DO $$ BEGIN
  ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
