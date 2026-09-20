-- CreateEnum
CREATE TYPE "SafetyFormStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SafetySubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'LOCKED');

-- CreateTable
CREATE TABLE "SafetyForm" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'V1.0',
    "status" "SafetyFormStatus" NOT NULL DEFAULT 'DRAFT',
    "definition" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyFormSubmission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "workOrderId" TEXT,
    "workOrderCode" TEXT,
    "customerName" TEXT,
    "locationLabel" TEXT,
    "status" "SafetySubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "values" JSONB NOT NULL,
    "meta" JSONB,
    "submittedById" TEXT,
    "submittedByName" TEXT,
    "submittedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyFormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SafetyForm_code_key" ON "SafetyForm"("code");

-- CreateIndex
CREATE INDEX "SafetyForm_status_idx" ON "SafetyForm"("status");

-- CreateIndex
CREATE INDEX "SafetyForm_updatedAt_idx" ON "SafetyForm"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SafetyFormSubmission_code_key" ON "SafetyFormSubmission"("code");

-- CreateIndex
CREATE INDEX "SafetyFormSubmission_formId_idx" ON "SafetyFormSubmission"("formId");

-- CreateIndex
CREATE INDEX "SafetyFormSubmission_status_idx" ON "SafetyFormSubmission"("status");

-- CreateIndex
CREATE INDEX "SafetyFormSubmission_submittedAt_idx" ON "SafetyFormSubmission"("submittedAt");

-- CreateIndex
CREATE INDEX "SafetyFormSubmission_workOrderId_idx" ON "SafetyFormSubmission"("workOrderId");

-- AddForeignKey
ALTER TABLE "SafetyFormSubmission" ADD CONSTRAINT "SafetyFormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "SafetyForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;