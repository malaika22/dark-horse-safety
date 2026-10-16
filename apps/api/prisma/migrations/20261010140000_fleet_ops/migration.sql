-- CreateEnum
CREATE TYPE "FleetInspectionResult" AS ENUM ('PASS', 'FAILED', 'NOT_DONE', 'PASS_WITH_FINDINGS');

-- CreateEnum
CREATE TYPE "FleetInspectionStatus" AS ENUM ('COMPLETE', 'NEEDS_REVIEW', 'EXPIRED', 'MISSING', 'REVIEWED', 'REPAIR_RAISED');

-- CreateEnum
CREATE TYPE "FleetCalibrationResult" AS ENUM ('PASS', 'PASS_WITH_ADJUSTMENT', 'FAILED', 'NOT_DONE');

-- CreateEnum
CREATE TYPE "FleetCalibrationStatus" AS ENUM ('CURRENT', 'DUE_SOON', 'OVERDUE', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "FleetRepairPriority" AS ENUM ('URGENT', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "FleetRepairStatus" AS ENUM ('OPEN', 'IN_REPAIR', 'AWAITING_PARTS', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CustomerOwnedStatus" AS ENUM ('CURRENT', 'EXPIRING', 'OVERDUE', 'NEEDS_REVIEW');

-- CreateTable
CREATE TABLE "FleetInspection" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "assetLabel" TEXT NOT NULL,
    "parentTruck" TEXT,
    "inspectorName" TEXT NOT NULL,
    "inspectedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "result" "FleetInspectionResult" NOT NULL,
    "status" "FleetInspectionStatus" NOT NULL,
    "type" TEXT,
    "flags" JSONB,
    "failedItems" JSONB,
    "payrollBlocking" BOOLEAN NOT NULL DEFAULT false,
    "hasLinkedRepair" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "customerName" TEXT,
    "locationLabel" TEXT,
    "workOrderCode" TEXT,
    "workOrderId" TEXT,
    "repairCode" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FleetInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetCorrectiveAction" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "inspectionCode" TEXT NOT NULL,
    "assetLabel" TEXT NOT NULL,
    "parentTruck" TEXT,
    "rootCause" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "priority" TEXT NOT NULL DEFAULT 'HIGH',
    "findings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FleetCorrectiveAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetCalibration" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "assetLabel" TEXT,
    "model" TEXT NOT NULL,
    "parentTruck" TEXT,
    "lastCalAt" TIMESTAMP(3),
    "nextDueAt" TIMESTAMP(3),
    "result" "FleetCalibrationResult" NOT NULL,
    "status" "FleetCalibrationStatus" NOT NULL,
    "serial" TEXT,
    "frequencyDays" INTEGER NOT NULL DEFAULT 365,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FleetCalibration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetRepairRequest" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "assetLabel" TEXT NOT NULL,
    "issue" TEXT NOT NULL,
    "priority" "FleetRepairPriority" NOT NULL,
    "vendorName" TEXT,
    "assignedName" TEXT,
    "etaAt" TIMESTAMP(3),
    "etaLabel" TEXT,
    "status" "FleetRepairStatus" NOT NULL DEFAULT 'OPEN',
    "parentTruck" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inspectionCode" TEXT,
    "purchaseOrder" TEXT,
    "contactPhone" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FleetRepairRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerOwnedEquipment" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "wellSite" TEXT NOT NULL,
    "county" TEXT,
    "lastInspectionResult" TEXT,
    "lastInspectionAt" TIMESTAMP(3),
    "nextDueAt" TIMESTAMP(3),
    "status" "CustomerOwnedStatus" NOT NULL,
    "customerOwned" BOOLEAN NOT NULL DEFAULT true,
    "type" TEXT,
    "model" TEXT,
    "serial" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerOwnedEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FleetInspection_code_key" ON "FleetInspection"("code");

-- CreateIndex
CREATE INDEX "FleetInspection_status_idx" ON "FleetInspection"("status");

-- CreateIndex
CREATE INDEX "FleetInspection_result_idx" ON "FleetInspection"("result");

-- CreateIndex
CREATE INDEX "FleetInspection_dueAt_idx" ON "FleetInspection"("dueAt");

-- CreateIndex
CREATE INDEX "FleetInspection_archivedAt_idx" ON "FleetInspection"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FleetCorrectiveAction_code_key" ON "FleetCorrectiveAction"("code");

-- CreateIndex
CREATE INDEX "FleetCorrectiveAction_inspectionId_idx" ON "FleetCorrectiveAction"("inspectionId");

-- CreateIndex
CREATE UNIQUE INDEX "FleetCalibration_code_key" ON "FleetCalibration"("code");

-- CreateIndex
CREATE INDEX "FleetCalibration_status_idx" ON "FleetCalibration"("status");

-- CreateIndex
CREATE INDEX "FleetCalibration_nextDueAt_idx" ON "FleetCalibration"("nextDueAt");

-- CreateIndex
CREATE INDEX "FleetCalibration_archivedAt_idx" ON "FleetCalibration"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FleetRepairRequest_code_key" ON "FleetRepairRequest"("code");

-- CreateIndex
CREATE INDEX "FleetRepairRequest_status_idx" ON "FleetRepairRequest"("status");

-- CreateIndex
CREATE INDEX "FleetRepairRequest_priority_idx" ON "FleetRepairRequest"("priority");

-- CreateIndex
CREATE INDEX "FleetRepairRequest_archivedAt_idx" ON "FleetRepairRequest"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerOwnedEquipment_code_key" ON "CustomerOwnedEquipment"("code");

-- CreateIndex
CREATE INDEX "CustomerOwnedEquipment_status_idx" ON "CustomerOwnedEquipment"("status");

-- CreateIndex
CREATE INDEX "CustomerOwnedEquipment_customerId_idx" ON "CustomerOwnedEquipment"("customerId");

-- CreateIndex
CREATE INDEX "CustomerOwnedEquipment_nextDueAt_idx" ON "CustomerOwnedEquipment"("nextDueAt");

-- CreateIndex
CREATE INDEX "CustomerOwnedEquipment_archivedAt_idx" ON "CustomerOwnedEquipment"("archivedAt");

-- AddForeignKey
ALTER TABLE "FleetInspection" ADD CONSTRAINT "FleetInspection_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetCorrectiveAction" ADD CONSTRAINT "FleetCorrectiveAction_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "FleetInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOwnedEquipment" ADD CONSTRAINT "CustomerOwnedEquipment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
