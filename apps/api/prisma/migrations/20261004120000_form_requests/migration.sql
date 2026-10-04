-- CreateEnum
CREATE TYPE "FormCorrectionStatus" AS ENUM ('OPEN', 'RESUBMITTED', 'APPROVED', 'REJECTED', 'NEEDS_INFO');

-- CreateEnum
CREATE TYPE "AdditionalFormStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'NEEDS_INFO', 'FORM_ADDED');

-- CreateEnum
CREATE TYPE "AdditionalFormUrgency" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "FormCorrectionRequest" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "formLabel" TEXT NOT NULL,
    "formTitle" TEXT NOT NULL,
    "workOrderId" TEXT,
    "customerName" TEXT NOT NULL,
    "locationLabel" TEXT,
    "reasonShort" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestedByStatus" TEXT,
    "status" "FormCorrectionStatus" NOT NULL DEFAULT 'OPEN',
    "originalStatus" TEXT NOT NULL DEFAULT 'LOCKED',
    "version" TEXT NOT NULL DEFAULT 'V1',
    "issueFlagged" TEXT NOT NULL,
    "correctionInstruction" TEXT NOT NULL,
    "resubmission" JSONB,
    "rule" TEXT NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormCorrectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdditionalFormRequest" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "workOrderId" TEXT,
    "customerName" TEXT NOT NULL,
    "locationLabel" TEXT NOT NULL,
    "technicianName" TEXT NOT NULL,
    "formRequested" TEXT NOT NULL,
    "reasonShort" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "urgency" "AdditionalFormUrgency" NOT NULL DEFAULT 'MEDIUM',
    "status" "AdditionalFormStatus" NOT NULL DEFAULT 'PENDING',
    "reviewer" TEXT NOT NULL DEFAULT 'UNASSIGNED',
    "history" JSONB NOT NULL,
    "rule" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdditionalFormRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FormCorrectionRequest_code_key" ON "FormCorrectionRequest"("code");

-- CreateIndex
CREATE INDEX "FormCorrectionRequest_workOrderId_idx" ON "FormCorrectionRequest"("workOrderId");

-- CreateIndex
CREATE INDEX "FormCorrectionRequest_status_idx" ON "FormCorrectionRequest"("status");

-- CreateIndex
CREATE INDEX "FormCorrectionRequest_createdAt_idx" ON "FormCorrectionRequest"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdditionalFormRequest_code_key" ON "AdditionalFormRequest"("code");

-- CreateIndex
CREATE INDEX "AdditionalFormRequest_workOrderId_idx" ON "AdditionalFormRequest"("workOrderId");

-- CreateIndex
CREATE INDEX "AdditionalFormRequest_status_idx" ON "AdditionalFormRequest"("status");

-- CreateIndex
CREATE INDEX "AdditionalFormRequest_urgency_idx" ON "AdditionalFormRequest"("urgency");

-- CreateIndex
CREATE INDEX "AdditionalFormRequest_createdAt_idx" ON "AdditionalFormRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "FormCorrectionRequest" ADD CONSTRAINT "FormCorrectionRequest_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdditionalFormRequest" ADD CONSTRAINT "AdditionalFormRequest_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
