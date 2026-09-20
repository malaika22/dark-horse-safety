-- AlterEnum
ALTER TYPE "RecurringSeriesFrequency" ADD VALUE 'FORTNIGHTLY';
ALTER TYPE "RecurringSeriesFrequency" ADD VALUE 'ANNUALLY';

-- AlterTable
ALTER TABLE "RecurringWorkOrderSeries" ADD COLUMN "dayRule" TEXT NOT NULL DEFAULT 'SAME DATE - 1ST';
ALTER TABLE "RecurringWorkOrderSeries" ADD COLUMN "generateAheadDays" INTEGER NOT NULL DEFAULT 14;
ALTER TABLE "RecurringWorkOrderSeries" ADD COLUMN "endsAfterOccurrences" INTEGER NOT NULL DEFAULT 12;
ALTER TABLE "RecurringWorkOrderSeries" ADD COLUMN "endsOnDate" TIMESTAMP(3);
ALTER TABLE "RecurringWorkOrderSeries" ADD COLUMN "endsNever" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "RecurringWorkOrderSeries" ADD COLUMN "crewTemplate" TEXT;
ALTER TABLE "RecurringWorkOrderSeries" ADD COLUMN "estimatedDurationHours" DECIMAL(8,1);
ALTER TABLE "RecurringWorkOrderSeries" ADD COLUMN "requiredForms" TEXT;
ALTER TABLE "RecurringWorkOrderSeries" ADD COLUMN "requiredEquipment" TEXT;

-- CreateTable
CREATE TABLE "RecurringSeriesOccurrence" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "occurrenceNumber" INTEGER NOT NULL,
    "workOrderId" TEXT,
    "workOrderCode" TEXT NOT NULL,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "crewLabel" TEXT NOT NULL DEFAULT '2 TECHS',
    "status" TEXT NOT NULL DEFAULT 'CLOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringSeriesOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecurringSeriesOccurrence_seriesId_occurrenceNumber_key" ON "RecurringSeriesOccurrence"("seriesId", "occurrenceNumber");

-- CreateIndex
CREATE INDEX "RecurringSeriesOccurrence_seriesId_idx" ON "RecurringSeriesOccurrence"("seriesId");

-- CreateIndex
CREATE INDEX "RecurringSeriesOccurrence_workOrderId_idx" ON "RecurringSeriesOccurrence"("workOrderId");

-- AddForeignKey
ALTER TABLE "RecurringSeriesOccurrence" ADD CONSTRAINT "RecurringSeriesOccurrence_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "RecurringWorkOrderSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
