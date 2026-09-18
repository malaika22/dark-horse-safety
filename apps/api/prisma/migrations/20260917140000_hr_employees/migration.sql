-- AlterEnum
ALTER TYPE "SavedViewScope" ADD VALUE IF NOT EXISTS 'EMPLOYEES';

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'NEED_REVIEW', 'OFFLINE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Employee" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedTruck" TEXT,
    "hoursThisCycle" DECIMAL(10,1) NOT NULL DEFAULT 0,
    "certExpiringLabel" TEXT,
    "certExpiringTone" TEXT,
    "bbsThisWeek" TEXT NOT NULL DEFAULT 'N/A',
    "crew" TEXT,
    "certificationHeld" TEXT,
    "hasOpenTimeEdit" BOOLEAN NOT NULL DEFAULT false,
    "missingBbs" BOOLEAN NOT NULL DEFAULT false,
    "onLeave" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "supervisorId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Employee_code_key" ON "Employee"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "Employee_userId_key" ON "Employee"("userId");
CREATE INDEX IF NOT EXISTS "Employee_status_idx" ON "Employee"("status");
CREATE INDEX IF NOT EXISTS "Employee_supervisorId_idx" ON "Employee"("supervisorId");
CREATE INDEX IF NOT EXISTS "Employee_assignedTruck_idx" ON "Employee"("assignedTruck");
CREATE INDEX IF NOT EXISTS "Employee_archivedAt_idx" ON "Employee"("archivedAt");
CREATE INDEX IF NOT EXISTS "Employee_crew_idx" ON "Employee"("crew");

DO $$ BEGIN
  ALTER TABLE "Employee" ADD CONSTRAINT "Employee_supervisorId_fkey"
    FOREIGN KEY ("supervisorId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
