-- CreateEnum
CREATE TYPE "OnCallZone" AS ENUM ('NORTH', 'SOUTH', 'CENTRAL');
CREATE TYPE "OnCallStatus" AS ENUM ('CONFIRMED', 'PENDING_SWAP', 'UNASSIGNED');
CREATE TYPE "OnCallSwapType" AS ENUM ('FULL_SHIFT', 'PARTIAL_SHIFT');
CREATE TYPE "OnCallSwapStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "OnCallCoverage" AS ENUM ('WEEKENDS', 'WEEKNIGHTS', 'BOTH');
CREATE TYPE "OnCallPattern" AS ENUM ('ROUND_ROBIN', 'WEIGHTED_SENIORITY', 'MANUAL_ORDER');

-- CreateTable
CREATE TABLE "OnCallAssignment" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "employeeId" TEXT,
    "backupId" TEXT,
    "zone" "OnCallZone",
    "status" "OnCallStatus" NOT NULL DEFAULT 'UNASSIGNED',
    "notes" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OnCallAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OnCallAssignment_date_key" ON "OnCallAssignment"("date");
CREATE INDEX "OnCallAssignment_employeeId_idx" ON "OnCallAssignment"("employeeId");
CREATE INDEX "OnCallAssignment_status_idx" ON "OnCallAssignment"("status");
CREATE INDEX "OnCallAssignment_date_idx" ON "OnCallAssignment"("date");

CREATE TABLE "OnCallSwapRequest" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "fromEmployeeId" TEXT,
    "toEmployeeId" TEXT,
    "swapType" "OnCallSwapType" NOT NULL DEFAULT 'FULL_SHIFT',
    "reason" TEXT,
    "status" "OnCallSwapStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OnCallSwapRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OnCallSwapRequest_assignmentId_idx" ON "OnCallSwapRequest"("assignmentId");
CREATE INDEX "OnCallSwapRequest_status_idx" ON "OnCallSwapRequest"("status");

ALTER TABLE "OnCallAssignment" ADD CONSTRAINT "OnCallAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnCallAssignment" ADD CONSTRAINT "OnCallAssignment_backupId_fkey" FOREIGN KEY ("backupId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnCallSwapRequest" ADD CONSTRAINT "OnCallSwapRequest_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "OnCallAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnCallSwapRequest" ADD CONSTRAINT "OnCallSwapRequest_fromEmployeeId_fkey" FOREIGN KEY ("fromEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnCallSwapRequest" ADD CONSTRAINT "OnCallSwapRequest_toEmployeeId_fkey" FOREIGN KEY ("toEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
