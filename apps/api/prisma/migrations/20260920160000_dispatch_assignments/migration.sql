-- CreateEnum
CREATE TYPE "DispatchAssignmentStatus" AS ENUM ('TO_DISPATCH', 'POSTED', 'ACCEPTED', 'DECLINED', 'NO_RESPONSE', 'CONFLICT', 'PTO', 'CANCELLED', 'REASSIGNED');

-- CreateEnum
CREATE TYPE "DispatchJobType" AS ENUM ('VISIT', 'CALL', 'TASK');

-- CreateEnum
CREATE TYPE "DispatchConflictKind" AS ENUM ('NONE', 'CERT', 'ASSET', 'OVERLAP', 'CUSTOMER_REQ', 'FORM', 'PTO');

-- CreateTable
CREATE TABLE "DispatchAssignment" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "employeeId" TEXT,
    "scheduledDate" DATE NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "jobType" "DispatchJobType" NOT NULL DEFAULT 'VISIT',
    "status" "DispatchAssignmentStatus" NOT NULL DEFAULT 'TO_DISPATCH',
    "conflictKind" "DispatchConflictKind" NOT NULL DEFAULT 'NONE',
    "conflictLabel" TEXT,
    "declineReason" TEXT,
    "notes" TEXT,
    "postedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "responseMinutes" INTEGER,
    "overrideReason" TEXT,
    "overrideByName" TEXT,
    "overriddenAt" TIMESTAMP(3),
    "notifyTechnician" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispatchAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DispatchAssignment_scheduledDate_idx" ON "DispatchAssignment"("scheduledDate");

-- CreateIndex
CREATE INDEX "DispatchAssignment_employeeId_idx" ON "DispatchAssignment"("employeeId");

-- CreateIndex
CREATE INDEX "DispatchAssignment_workOrderId_idx" ON "DispatchAssignment"("workOrderId");

-- CreateIndex
CREATE INDEX "DispatchAssignment_status_idx" ON "DispatchAssignment"("status");

-- AddForeignKey
ALTER TABLE "DispatchAssignment" ADD CONSTRAINT "DispatchAssignment_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchAssignment" ADD CONSTRAINT "DispatchAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
