-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "PayCycleStatus" AS ENUM ('CLOSED', 'OPEN', 'UPCOMING');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable PayCycle
ALTER TABLE "PayCycle" ADD COLUMN IF NOT EXISTS "status" "PayCycleStatus" NOT NULL DEFAULT 'UPCOMING';
ALTER TABLE "PayCycle" ADD COLUMN IF NOT EXISTS "lockAt" TIMESTAMP(3);
ALTER TABLE "PayCycle" ADD COLUMN IF NOT EXISTS "totalHours" DECIMAL(12,1);
ALTER TABLE "PayCycle" ADD COLUMN IF NOT EXISTS "totalAmount" DECIMAL(14,2);
ALTER TABLE "PayCycle" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "PayCycle_status_idx" ON "PayCycle"("status");

-- CreateTable PayCycleSettings
CREATE TABLE IF NOT EXISTS "PayCycleSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "dailyOtThresholdHrs" DECIMAL(6,1) NOT NULL DEFAULT 8,
    "weeklyOtThresholdHrs" DECIMAL(6,1) NOT NULL DEFAULT 40,
    "otMultiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.5,
    "doubleTimeAfterHrs" DECIMAL(6,1) NOT NULL DEFAULT 12,
    "minBillableBlock" TEXT NOT NULL DEFAULT '15 MIN',
    "roundTo" TEXT NOT NULL DEFAULT '15 MIN',
    "annualPtoDays" DECIMAL(6,1) NOT NULL DEFAULT 20,
    "accrualRatePerPeriod" DECIMAL(6,2) NOT NULL DEFAULT 0.77,
    "annualSickDays" DECIMAL(6,1) NOT NULL DEFAULT 10,
    "carryoverCapDays" DECIMAL(6,1) NOT NULL DEFAULT 5,
    "noticeRequiredDays" INTEGER NOT NULL DEFAULT 14,
    "blackout" TEXT NOT NULL DEFAULT 'NONE',
    "cadence" TEXT NOT NULL DEFAULT 'BI-WEEKLY',
    "cycleLengthDays" INTEGER NOT NULL DEFAULT 14,
    "lockTime" TEXT NOT NULL DEFAULT '11:59 PM CT',
    "autoApproveRules" TEXT NOT NULL DEFAULT 'NO EXCEPTIONS, AFTER 48H',
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 2,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayCycleSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable ObservedHoliday
CREATE TABLE IF NOT EXISTS "ObservedHoliday" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "observedOn" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "hoursCredited" DECIMAL(6,1) NOT NULL DEFAULT 8,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObservedHoliday_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ObservedHoliday_year_observedOn_key" ON "ObservedHoliday"("year", "observedOn");
CREATE INDEX IF NOT EXISTS "ObservedHoliday_year_sortOrder_idx" ON "ObservedHoliday"("year", "sortOrder");
