DO $$ BEGIN
  CREATE TYPE "TimeOffStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TimeOffType" AS ENUM ('PTO', 'SICK', 'UNPAID', 'BEREAVEMENT', 'HOLIDAY');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "TimeOffRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "TimeOffType" NOT NULL DEFAULT 'PTO',
    "status" "TimeOffStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "startLabel" TEXT NOT NULL,
    "endLabel" TEXT NOT NULL,
    "dayCount" INTEGER NOT NULL DEFAULT 1,
    "hoursRequested" DECIMAL(10,1) NOT NULL DEFAULT 0,
    "balanceAfter" DECIMAL(10,1),
    "coverage" TEXT NOT NULL DEFAULT 'COVERED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedLabel" TEXT NOT NULL,
    "reason" TEXT,
    "adminNote" TEXT,
    "crossesPayCycle" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeOffRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TimeOffRequest_employeeId_idx" ON "TimeOffRequest"("employeeId");
CREATE INDEX IF NOT EXISTS "TimeOffRequest_status_idx" ON "TimeOffRequest"("status");
CREATE INDEX IF NOT EXISTS "TimeOffRequest_type_idx" ON "TimeOffRequest"("type");
CREATE INDEX IF NOT EXISTS "TimeOffRequest_startDate_idx" ON "TimeOffRequest"("startDate");
CREATE INDEX IF NOT EXISTS "TimeOffRequest_coverage_idx" ON "TimeOffRequest"("coverage");
CREATE INDEX IF NOT EXISTS "TimeOffRequest_archivedAt_idx" ON "TimeOffRequest"("archivedAt");

DO $$ BEGIN
  ALTER TABLE "TimeOffRequest" ADD CONSTRAINT "TimeOffRequest_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
