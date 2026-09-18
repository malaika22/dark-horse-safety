-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "TimeEditRequestStatus" AS ENUM ('PENDING', 'NEEDS_CLARIFICATION', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TimeEditRequestType" AS ENUM ('CLOCK_IN_CHANGE', 'CLOCK_OUT_CHANGE', 'ADMIN_OVERRIDE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "TimeEditRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "timeEntryId" TEXT,
    "workDate" DATE NOT NULL,
    "dateLabel" TEXT NOT NULL,
    "cycleLabel" TEXT NOT NULL,
    "workOrderCode" TEXT,
    "customerName" TEXT,
    "type" "TimeEditRequestType" NOT NULL,
    "status" "TimeEditRequestStatus" NOT NULL DEFAULT 'PENDING',
    "deltaHours" DECIMAL(10,1) NOT NULL DEFAULT 0,
    "deltaLabel" TEXT NOT NULL,
    "differenceKind" TEXT NOT NULL DEFAULT 'REGULAR TIME',
    "relativeTime" TEXT,
    "originalClockIn" TEXT,
    "originalClockOut" TEXT,
    "originalHours" DECIMAL(10,1),
    "requestedClockIn" TEXT,
    "requestedClockOut" TEXT,
    "requestedHours" DECIMAL(10,1),
    "technicianReason" TEXT,
    "gpsContext" TEXT,
    "adminNote" TEXT,
    "needsClarification" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEditRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TimeEditRequest_employeeId_idx" ON "TimeEditRequest"("employeeId");
CREATE INDEX IF NOT EXISTS "TimeEditRequest_status_idx" ON "TimeEditRequest"("status");
CREATE INDEX IF NOT EXISTS "TimeEditRequest_workDate_idx" ON "TimeEditRequest"("workDate");
CREATE INDEX IF NOT EXISTS "TimeEditRequest_type_idx" ON "TimeEditRequest"("type");
CREATE INDEX IF NOT EXISTS "TimeEditRequest_cycleLabel_idx" ON "TimeEditRequest"("cycleLabel");

DO $$ BEGIN
  ALTER TABLE "TimeEditRequest" ADD CONSTRAINT "TimeEditRequest_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
