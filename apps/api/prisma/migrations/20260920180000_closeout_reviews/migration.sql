-- CreateEnum
CREATE TYPE "CloseoutStatus" AS ENUM ('PENDING', 'ACCEPTED', 'RETURNED', 'HELD');

-- CreateTable
CREATE TABLE "CloseoutReview" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serviceDate" DATE,
    "status" "CloseoutStatus" NOT NULL DEFAULT 'PENDING',
    "locationLabel" TEXT,
    "flagCount" INTEGER NOT NULL DEFAULT 0,
    "flags" JSONB,
    "avgDistanceMi" DECIMAL(8,2),
    "timeRows" JSONB,
    "forms" JSONB,
    "photos" JSONB,
    "salesLines" JSONB,
    "salesTotal" DECIMAL(14,2),
    "purchaseOrders" JSONB,
    "salesTicketId" TEXT,
    "decisionNote" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decidedByName" TEXT,
    "decidedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CloseoutReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CloseoutReview_workOrderId_key" ON "CloseoutReview"("workOrderId");

-- CreateIndex
CREATE INDEX "CloseoutReview_customerId_idx" ON "CloseoutReview"("customerId");

-- CreateIndex
CREATE INDEX "CloseoutReview_submittedById_idx" ON "CloseoutReview"("submittedById");

-- CreateIndex
CREATE INDEX "CloseoutReview_status_idx" ON "CloseoutReview"("status");

-- CreateIndex
CREATE INDEX "CloseoutReview_submittedAt_idx" ON "CloseoutReview"("submittedAt");

-- AddForeignKey
ALTER TABLE "CloseoutReview" ADD CONSTRAINT "CloseoutReview_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CloseoutReview" ADD CONSTRAINT "CloseoutReview_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CloseoutReview" ADD CONSTRAINT "CloseoutReview_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
