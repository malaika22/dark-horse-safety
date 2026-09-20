-- CreateEnum
CREATE TYPE "RecurringSeriesFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY');

-- CreateEnum
CREATE TYPE "RecurringSeriesStatus" AS ENUM ('ACTIVE', 'ENDED');

-- CreateTable
CREATE TABLE "RecurringWorkOrderSeries" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "frequency" "RecurringSeriesFrequency" NOT NULL DEFAULT 'MONTHLY',
    "nextOccurrence" TIMESTAMP(3),
    "generatedCount" INTEGER NOT NULL DEFAULT 0,
    "remainingCount" INTEGER NOT NULL DEFAULT 0,
    "status" "RecurringSeriesStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringWorkOrderSeries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecurringWorkOrderSeries_code_key" ON "RecurringWorkOrderSeries"("code");

-- CreateIndex
CREATE INDEX "RecurringWorkOrderSeries_customerId_idx" ON "RecurringWorkOrderSeries"("customerId");

-- CreateIndex
CREATE INDEX "RecurringWorkOrderSeries_status_idx" ON "RecurringWorkOrderSeries"("status");

-- CreateIndex
CREATE INDEX "RecurringWorkOrderSeries_nextOccurrence_idx" ON "RecurringWorkOrderSeries"("nextOccurrence");

-- CreateIndex
CREATE INDEX "RecurringWorkOrderSeries_archivedAt_idx" ON "RecurringWorkOrderSeries"("archivedAt");

-- AddForeignKey
ALTER TABLE "RecurringWorkOrderSeries" ADD CONSTRAINT "RecurringWorkOrderSeries_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
