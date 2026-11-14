-- Settings screens: company profile, business rules, overrides, retention, defaults, recipients

CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "companyName" TEXT NOT NULL,
    "establishmentName" TEXT NOT NULL,
    "streetAddress" TEXT NOT NULL,
    "cityStateZip" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "ein" TEXT NOT NULL,
    "naicsCode" TEXT NOT NULL,
    "sicCode" TEXT NOT NULL,
    "annualAverageEmployees" TEXT NOT NULL,
    "totalHoursWorked" TEXT NOT NULL,
    "companyExecutive" TEXT NOT NULL,
    "recordkeepingContact" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessRule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "appliesTo" TEXT NOT NULL,
    "enforcement" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "statusLabel" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "hardGate" BOOLEAN NOT NULL DEFAULT false,
    "customerOverride" BOOLEAN NOT NULL DEFAULT false,
    "pendingReview" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BusinessRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BusinessRule_code_key" ON "BusinessRule"("code");
CREATE INDEX "BusinessRule_domain_idx" ON "BusinessRule"("domain");
CREATE INDEX "BusinessRule_status_idx" ON "BusinessRule"("status");
CREATE INDEX "BusinessRule_sortOrder_idx" ON "BusinessRule"("sortOrder");

CREATE TABLE "RuleOverride" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "whenLabel" TEXT NOT NULL,
    "ruleDomain" TEXT NOT NULL,
    "record" TEXT NOT NULL,
    "change" TEXT NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "statusLabel" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "effectiveLabel" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RuleOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RuleOverride_code_key" ON "RuleOverride"("code");
CREATE INDEX "RuleOverride_occurredAt_idx" ON "RuleOverride"("occurredAt");
CREATE INDEX "RuleOverride_domain_idx" ON "RuleOverride"("domain");
CREATE INDEX "RuleOverride_status_idx" ON "RuleOverride"("status");

CREATE TABLE "RetentionPolicy" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "note" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RetentionPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RetentionClass" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "recordClass" TEXT NOT NULL,
    "proposedPeriod" TEXT NOT NULL,
    "afterExpiry" TEXT NOT NULL,
    "legalHold" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "periodTone" TEXT NOT NULL DEFAULT 'default',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RetentionClass_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RetentionClass_code_key" ON "RetentionClass"("code");
CREATE INDEX "RetentionClass_sortOrder_idx" ON "RetentionClass"("sortOrder");

CREATE TABLE "GlobalDefaults" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "closeoutEscalation" TEXT NOT NULL,
    "closeoutOwner" TEXT NOT NULL,
    "workStoppedEscalation" TEXT NOT NULL,
    "workStoppedOwner" TEXT NOT NULL,
    "recurringGeneration" TEXT NOT NULL,
    "recurringOwner" TEXT NOT NULL,
    "payCycle" TEXT NOT NULL,
    "payCycleOwner" TEXT NOT NULL,
    "poApproval" TEXT NOT NULL,
    "poOwner" TEXT NOT NULL,
    "missingPoBlock" TEXT NOT NULL,
    "missingPoOwner" TEXT NOT NULL,
    "requiredForms" TEXT NOT NULL,
    "requiredFormsOwner" TEXT NOT NULL,
    "geofenceFallback" TEXT NOT NULL,
    "geofenceOwner" TEXT NOT NULL,
    "msaEnforcement" TEXT NOT NULL,
    "msaOwner" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GlobalDefaults_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationRecipient" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "primary" TEXT NOT NULL,
    "ccEscalate" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationRecipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationRecipient_code_key" ON "NotificationRecipient"("code");
CREATE INDEX "NotificationRecipient_sortOrder_idx" ON "NotificationRecipient"("sortOrder");
