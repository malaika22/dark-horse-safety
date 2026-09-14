-- CreateEnum
CREATE TYPE "CrmRecordStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED', 'NEEDS_REVIEW', 'EXPIRED', 'PENDING', 'COMPLETE', 'IN_PROGRESS', 'ON_HOLD', 'SUBMITTED', 'WON', 'LOST', 'SENT', 'OPEN');

-- CreateEnum
CREATE TYPE "QuoteApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NOT_REQUIRED');

-- CreateEnum
CREATE TYPE "SalesActivityType" AS ENUM ('CALL', 'VISIT', 'MEETING', 'EMAIL', 'OTHER');

-- CreateEnum
CREATE TYPE "EnforcementLevel" AS ENUM ('HARD_GATE', 'SOFT_GATE', 'ADVISORY');

-- CreateEnum
CREATE TYPE "SavedViewScope" AS ENUM ('CUSTOMERS', 'CONTACTS', 'LOCATIONS', 'PRICING_RULES', 'REQUIREMENTS', 'FORM_RULES', 'ROUTE_RULES', 'EOD_REPORTS', 'SALES_ACTIVITIES', 'QUOTES');

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalEntityName" TEXT,
    "status" "CrmRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "industry" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "billingAddress" TEXT,
    "mailingAddress" TEXT,
    "paymentTerms" TEXT,
    "creditLimit" DECIMAL(14,2),
    "taxExempt" BOOLEAN NOT NULL DEFAULT false,
    "taxId" TEXT,
    "pricingTier" TEXT,
    "netsuiteId" TEXT,
    "isnId" TEXT,
    "veriforceId" TEXT,
    "msaOnFile" BOOLEAN NOT NULL DEFAULT false,
    "msaExpiry" TIMESTAMP(3),
    "coiExpiry" TIMESTAMP(3),
    "w9OnFile" TEXT,
    "clockInRadius" TEXT,
    "requiresPo" BOOLEAN NOT NULL DEFAULT false,
    "defaultRequiredForms" TEXT,
    "openJobs" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "assignedRepId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "roleTitle" TEXT,
    "email" TEXT,
    "mobile" TEXT,
    "officePhone" TEXT,
    "preferredMethod" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "linkedFromScan" TEXT,
    "status" "CrmRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastActivityAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "assignedRepId" TEXT,
    "primaryCustomerId" TEXT,
    "locationLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactCustomer" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "roleAtCustomer" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "wellPadNumber" TEXT,
    "apiNumber" TEXT,
    "county" TEXT,
    "state" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "siteType" TEXT,
    "status" "CrmRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "accessNotes" TEXT,
    "siteContact" TEXT,
    "geofenceRadius" TEXT,
    "gpsRequired" BOOLEAN NOT NULL DEFAULT false,
    "nearestHospital" TEXT,
    "openJobs" INTEGER NOT NULL DEFAULT 0,
    "gpsStatus" TEXT,
    "city" TEXT,
    "archivedAt" TIMESTAMP(3),
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "serviceItem" TEXT NOT NULL,
    "rateType" TEXT,
    "rate" DECIMAL(14,2) NOT NULL,
    "unit" TEXT,
    "minimumCharge" DECIMAL(14,2),
    "overtimeMultiplier" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "notes" TEXT,
    "status" "CrmRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "customerId" TEXT NOT NULL,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerRequirement" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "requirementType" TEXT,
    "appliesTo" TEXT,
    "enforcementLevel" "EnforcementLevel" NOT NULL DEFAULT 'SOFT_GATE',
    "evidenceRequired" BOOLEAN NOT NULL DEFAULT false,
    "renewalPeriod" TEXT,
    "notes" TEXT,
    "dueDate" TIMESTAMP(3),
    "reviewCycle" TEXT,
    "docsRequired" BOOLEAN NOT NULL DEFAULT false,
    "status" "CrmRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "customerId" TEXT NOT NULL,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormRule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "jobType" TEXT,
    "formTemplate" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "hardGate" BOOLEAN NOT NULL DEFAULT false,
    "blocksToggle" BOOLEAN NOT NULL DEFAULT false,
    "due" TEXT,
    "appliesFrom" TIMESTAMP(3),
    "trigger" TEXT,
    "appliesTo" TEXT,
    "version" TEXT,
    "status" "CrmRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "customerId" TEXT NOT NULL,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteRule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "geofenceRadius" TEXT,
    "gpsRequired" BOOLEAN NOT NULL DEFAULT false,
    "clockInWindow" TEXT,
    "routeFrom" TEXT,
    "expectedTravelTime" TEXT,
    "mileageRateOverride" TEXT,
    "routeLabel" TEXT,
    "status" "CrmRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "customerId" TEXT NOT NULL,
    "locationId" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EodReport" (
    "id" TEXT NOT NULL,
    "reportCode" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "activitiesCount" INTEGER NOT NULL DEFAULT 0,
    "callsCount" INTEGER NOT NULL DEFAULT 0,
    "callsDetail" TEXT,
    "visitsCount" INTEGER NOT NULL DEFAULT 0,
    "visitsDetail" TEXT,
    "meetingsCount" INTEGER NOT NULL DEFAULT 0,
    "meetingsNote" TEXT,
    "quotesNote" TEXT,
    "pipelineNote" TEXT,
    "notes" TEXT,
    "status" "CrmRecordStatus" NOT NULL DEFAULT 'SUBMITTED',
    "pipelineValue" DECIMAL(14,2),
    "quotesSent" INTEGER NOT NULL DEFAULT 0,
    "closedToday" DECIMAL(14,2),
    "nextDayPlan" TEXT,
    "repId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EodReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EodActivityLine" (
    "id" TEXT NOT NULL,
    "eodReportId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EodActivityLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesActivity" (
    "id" TEXT NOT NULL,
    "activityCode" TEXT NOT NULL,
    "type" "SalesActivityType" NOT NULL DEFAULT 'CALL',
    "subject" TEXT,
    "outcome" TEXT,
    "duration" TEXT,
    "notes" TEXT,
    "followUpAt" TIMESTAMP(3),
    "status" "CrmRecordStatus" NOT NULL DEFAULT 'COMPLETE',
    "activityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    "customerId" TEXT,
    "contactId" TEXT,
    "repId" TEXT,
    "linkedQuoteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "CrmRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "approvalStatus" "QuoteApprovalStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "expiresAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "terms" TEXT,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "customerId" TEXT NOT NULL,
    "contactId" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteLineItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "quantity" DECIMAL(14,2) NOT NULL DEFAULT 1,
    "rate" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuoteLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmDocument" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT,
    "url" TEXT,
    "expiresAt" TIMESTAMP(3),
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedView" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" "SavedViewScope" NOT NULL,
    "payload" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");

-- CreateIndex
CREATE INDEX "Customer_status_idx" ON "Customer"("status");

-- CreateIndex
CREATE INDEX "Customer_assignedRepId_idx" ON "Customer"("assignedRepId");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "Customer_archivedAt_idx" ON "Customer"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_code_key" ON "Contact"("code");

-- CreateIndex
CREATE INDEX "Contact_status_idx" ON "Contact"("status");

-- CreateIndex
CREATE INDEX "Contact_assignedRepId_idx" ON "Contact"("assignedRepId");

-- CreateIndex
CREATE INDEX "Contact_primaryCustomerId_idx" ON "Contact"("primaryCustomerId");

-- CreateIndex
CREATE INDEX "Contact_fullName_idx" ON "Contact"("fullName");

-- CreateIndex
CREATE INDEX "ContactCustomer_customerId_idx" ON "ContactCustomer"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactCustomer_contactId_customerId_key" ON "ContactCustomer"("contactId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Location_code_key" ON "Location"("code");

-- CreateIndex
CREATE INDEX "Location_customerId_idx" ON "Location"("customerId");

-- CreateIndex
CREATE INDEX "Location_status_idx" ON "Location"("status");

-- CreateIndex
CREATE INDEX "Location_name_idx" ON "Location"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PricingRule_code_key" ON "PricingRule"("code");

-- CreateIndex
CREATE INDEX "PricingRule_customerId_idx" ON "PricingRule"("customerId");

-- CreateIndex
CREATE INDEX "PricingRule_status_idx" ON "PricingRule"("status");

-- CreateIndex
CREATE INDEX "PricingRule_serviceItem_idx" ON "PricingRule"("serviceItem");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerRequirement_code_key" ON "CustomerRequirement"("code");

-- CreateIndex
CREATE INDEX "CustomerRequirement_customerId_idx" ON "CustomerRequirement"("customerId");

-- CreateIndex
CREATE INDEX "CustomerRequirement_status_idx" ON "CustomerRequirement"("status");

-- CreateIndex
CREATE INDEX "CustomerRequirement_enforcementLevel_idx" ON "CustomerRequirement"("enforcementLevel");

-- CreateIndex
CREATE UNIQUE INDEX "FormRule_code_key" ON "FormRule"("code");

-- CreateIndex
CREATE INDEX "FormRule_customerId_idx" ON "FormRule"("customerId");

-- CreateIndex
CREATE INDEX "FormRule_status_idx" ON "FormRule"("status");

-- CreateIndex
CREATE INDEX "FormRule_formTemplate_idx" ON "FormRule"("formTemplate");

-- CreateIndex
CREATE UNIQUE INDEX "RouteRule_code_key" ON "RouteRule"("code");

-- CreateIndex
CREATE INDEX "RouteRule_customerId_idx" ON "RouteRule"("customerId");

-- CreateIndex
CREATE INDEX "RouteRule_locationId_idx" ON "RouteRule"("locationId");

-- CreateIndex
CREATE INDEX "RouteRule_status_idx" ON "RouteRule"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EodReport_reportCode_key" ON "EodReport"("reportCode");

-- CreateIndex
CREATE INDEX "EodReport_repId_idx" ON "EodReport"("repId");

-- CreateIndex
CREATE INDEX "EodReport_reportDate_idx" ON "EodReport"("reportDate");

-- CreateIndex
CREATE INDEX "EodReport_status_idx" ON "EodReport"("status");

-- CreateIndex
CREATE INDEX "EodActivityLine_eodReportId_idx" ON "EodActivityLine"("eodReportId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesActivity_activityCode_key" ON "SalesActivity"("activityCode");

-- CreateIndex
CREATE INDEX "SalesActivity_customerId_idx" ON "SalesActivity"("customerId");

-- CreateIndex
CREATE INDEX "SalesActivity_contactId_idx" ON "SalesActivity"("contactId");

-- CreateIndex
CREATE INDEX "SalesActivity_repId_idx" ON "SalesActivity"("repId");

-- CreateIndex
CREATE INDEX "SalesActivity_activityAt_idx" ON "SalesActivity"("activityAt");

-- CreateIndex
CREATE INDEX "SalesActivity_type_idx" ON "SalesActivity"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_quoteNumber_key" ON "Quote"("quoteNumber");

-- CreateIndex
CREATE INDEX "Quote_customerId_idx" ON "Quote"("customerId");

-- CreateIndex
CREATE INDEX "Quote_contactId_idx" ON "Quote"("contactId");

-- CreateIndex
CREATE INDEX "Quote_status_idx" ON "Quote"("status");

-- CreateIndex
CREATE INDEX "Quote_ownerId_idx" ON "Quote"("ownerId");

-- CreateIndex
CREATE INDEX "QuoteLineItem_quoteId_idx" ON "QuoteLineItem"("quoteId");

-- CreateIndex
CREATE INDEX "CrmDocument_customerId_idx" ON "CrmDocument"("customerId");

-- CreateIndex
CREATE INDEX "SavedView_userId_scope_idx" ON "SavedView"("userId", "scope");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_assignedRepId_fkey" FOREIGN KEY ("assignedRepId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_assignedRepId_fkey" FOREIGN KEY ("assignedRepId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_primaryCustomerId_fkey" FOREIGN KEY ("primaryCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactCustomer" ADD CONSTRAINT "ContactCustomer_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactCustomer" ADD CONSTRAINT "ContactCustomer_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRequirement" ADD CONSTRAINT "CustomerRequirement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRequirement" ADD CONSTRAINT "CustomerRequirement_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormRule" ADD CONSTRAINT "FormRule_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormRule" ADD CONSTRAINT "FormRule_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteRule" ADD CONSTRAINT "RouteRule_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteRule" ADD CONSTRAINT "RouteRule_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteRule" ADD CONSTRAINT "RouteRule_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EodReport" ADD CONSTRAINT "EodReport_repId_fkey" FOREIGN KEY ("repId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EodActivityLine" ADD CONSTRAINT "EodActivityLine_eodReportId_fkey" FOREIGN KEY ("eodReportId") REFERENCES "EodReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesActivity" ADD CONSTRAINT "SalesActivity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesActivity" ADD CONSTRAINT "SalesActivity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesActivity" ADD CONSTRAINT "SalesActivity_repId_fkey" FOREIGN KEY ("repId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesActivity" ADD CONSTRAINT "SalesActivity_linkedQuoteId_fkey" FOREIGN KEY ("linkedQuoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLineItem" ADD CONSTRAINT "QuoteLineItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmDocument" ADD CONSTRAINT "CrmDocument_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
