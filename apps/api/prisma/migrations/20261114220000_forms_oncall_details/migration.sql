-- Team profiles, audit drawers, on-call rules, and forms library

ALTER TABLE "AccessTeam" ADD COLUMN "profile" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AccessAuditEvent" ADD COLUMN "drawer" TEXT NOT NULL DEFAULT '';

CREATE TABLE "OnCallRules" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "maxConsecutiveDays" INTEGER NOT NULL,
    "minRestDays" INTEGER NOT NULL,
    "leadHours" INTEGER NOT NULL,
    "balanceEvenly" BOOLEAN NOT NULL DEFAULT false,
    "autoPublish" BOOLEAN NOT NULL DEFAULT false,
    "requireBackup" BOOLEAN NOT NULL DEFAULT false,
    "sameZoneSwaps" BOOLEAN NOT NULL DEFAULT false,
    "notifyBeforeShift" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OnCallRules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FormLibraryStat" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "submissions" INTEGER NOT NULL,
    "missingRequired" INTEGER NOT NULL,
    "failedImports" INTEGER NOT NULL,
    "pendingReview" INTEGER NOT NULL,
    CONSTRAINT "FormLibraryStat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FormTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "submissions" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "FormTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL,
    "submittedLabel" TEXT NOT NULL,
    "formType" TEXT NOT NULL,
    "formNumber" TEXT NOT NULL,
    "weather" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "attachments" INTEGER NOT NULL,
    "review" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "linked" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SettingsFormRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "appliesTo" TEXT NOT NULL,
    "forms" TEXT NOT NULL,
    "payrollBloc" TEXT NOT NULL,
    "billing" TEXT NOT NULL,
    "active" TEXT NOT NULL,
    "updatedLabel" TEXT NOT NULL,
    "window" TEXT NOT NULL DEFAULT 'CURRENT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SettingsFormRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArchivedCanvas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "subs" INTEGER NOT NULL,
    "lastLabel" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "window" TEXT NOT NULL,
    "restored" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ArchivedCanvas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FormDraft" (
    "id" TEXT NOT NULL DEFAULT 'current',
    "title" TEXT NOT NULL,
    "sectionsJson" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FormDraft_pkey" PRIMARY KEY ("id")
);
