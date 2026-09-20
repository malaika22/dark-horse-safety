-- CreateEnum
CREATE TYPE "SalesTicketStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'RETURNED', 'ADJUSTED', 'APPROVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "SalesTicket" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "workOrderId" TEXT,
    "customerId" TEXT NOT NULL,
    "employeeId" TEXT,
    "serviceItem" TEXT NOT NULL,
    "status" "SalesTicketStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedRate" DECIMAL(14,2) NOT NULL,
    "submittedHours" DECIMAL(10,1) NOT NULL,
    "hoursLocked" BOOLEAN NOT NULL DEFAULT true,
    "rateSource" TEXT NOT NULL DEFAULT 'CUSTOMER PRICING RULE',
    "submittedValue" DECIMAL(14,2) NOT NULL,
    "adjustedRate" DECIMAL(14,2),
    "adjustedValue" DECIMAL(14,2),
    "rateDifference" DECIMAL(14,2),
    "rateAdjustReason" TEXT,
    "rateAdjustedAt" TIMESTAMP(3),
    "rateAdjustedByName" TEXT,
    "rateAdjustedById" TEXT,
    "corrections" JSONB,
    "returnNote" TEXT,
    "dueBackBy" TIMESTAMP(3),
    "notifyPush" BOOLEAN NOT NULL DEFAULT true,
    "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
    "returnedAt" TIMESTAMP(3),
    "returnedByName" TEXT,
    "returnedById" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesTicket_code_key" ON "SalesTicket"("code");

-- CreateIndex
CREATE INDEX "SalesTicket_customerId_idx" ON "SalesTicket"("customerId");

-- CreateIndex
CREATE INDEX "SalesTicket_workOrderId_idx" ON "SalesTicket"("workOrderId");

-- CreateIndex
CREATE INDEX "SalesTicket_employeeId_idx" ON "SalesTicket"("employeeId");

-- CreateIndex
CREATE INDEX "SalesTicket_status_idx" ON "SalesTicket"("status");

-- CreateIndex
CREATE INDEX "SalesTicket_archivedAt_idx" ON "SalesTicket"("archivedAt");

-- AddForeignKey
ALTER TABLE "SalesTicket" ADD CONSTRAINT "SalesTicket_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesTicket" ADD CONSTRAINT "SalesTicket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesTicket" ADD CONSTRAINT "SalesTicket_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
