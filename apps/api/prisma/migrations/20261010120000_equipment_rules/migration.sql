-- CreateEnum
CREATE TYPE "EquipmentEnforcement" AS ENUM ('BLOCKS_DISPATCH', 'WARNING', 'INFORMATIONAL');

-- CreateEnum
CREATE TYPE "EquipmentPerUnit" AS ENUM ('JOB', 'TECHNICIAN', 'TRUCK');

-- CreateEnum
CREATE TYPE "EquipmentRuleStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "EquipmentRule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "equipment" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "per" "EquipmentPerUnit" NOT NULL DEFAULT 'JOB',
    "enforcement" "EquipmentEnforcement" NOT NULL DEFAULT 'BLOCKS_DISPATCH',
    "substitutes" TEXT,
    "appliesTo" TEXT NOT NULL DEFAULT 'ALL JOBS',
    "condition" TEXT,
    "jobType" TEXT NOT NULL,
    "status" "EquipmentRuleStatus" NOT NULL DEFAULT 'ACTIVE',
    "overrides" JSONB,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentRule_code_key" ON "EquipmentRule"("code");

-- CreateIndex
CREATE INDEX "EquipmentRule_jobType_idx" ON "EquipmentRule"("jobType");

-- CreateIndex
CREATE INDEX "EquipmentRule_status_idx" ON "EquipmentRule"("status");

-- CreateIndex
CREATE INDEX "EquipmentRule_enforcement_idx" ON "EquipmentRule"("enforcement");

-- CreateIndex
CREATE INDEX "EquipmentRule_archivedAt_idx" ON "EquipmentRule"("archivedAt");
