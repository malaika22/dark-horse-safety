-- CreateEnum
CREATE TYPE "SupervisorRouteStatus" AS ENUM ('ACTIVE', 'UNROUTED');

-- CreateEnum
CREATE TYPE "ManagerTier" AS ENUM ('OPS_MGR', 'HSE_MGR');

-- CreateTable
CREATE TABLE "SupervisorRoute" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SupervisorRouteStatus" NOT NULL DEFAULT 'ACTIVE',
    "managerTier" "ManagerTier" NOT NULL DEFAULT 'OPS_MGR',
    "region" TEXT,
    "crew" TEXT,
    "escalatesTo" TEXT NOT NULL DEFAULT 'OPS MGR',
    "escalateDelay" TEXT NOT NULL DEFAULT '2 BUSINESS DAYS',
    "backupName" TEXT,
    "coverageWindow" TEXT NOT NULL DEFAULT '24/7',
    "onCall" BOOLEAN NOT NULL DEFAULT false,
    "approvesTimeEdit" BOOLEAN NOT NULL DEFAULT true,
    "approvesTimeOff" BOOLEAN NOT NULL DEFAULT true,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "supervisorEmployeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupervisorRoute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupervisorRoute_code_key" ON "SupervisorRoute"("code");

-- CreateIndex
CREATE INDEX "SupervisorRoute_managerTier_idx" ON "SupervisorRoute"("managerTier");

-- CreateIndex
CREATE INDEX "SupervisorRoute_status_idx" ON "SupervisorRoute"("status");

-- CreateIndex
CREATE INDEX "SupervisorRoute_sortOrder_idx" ON "SupervisorRoute"("sortOrder");

-- AddForeignKey
ALTER TABLE "SupervisorRoute" ADD CONSTRAINT "SupervisorRoute_supervisorEmployeeId_fkey" FOREIGN KEY ("supervisorEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
