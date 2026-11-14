-- Time categories, payroll rules, and mobile device sync

CREATE TABLE "TimeCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entryCount" INTEGER NOT NULL DEFAULT 0,
    "paid" BOOLEAN NOT NULL DEFAULT true,
    "billable" BOOLEAN NOT NULL DEFAULT false,
    "countsToOt" BOOLEAN NOT NULL DEFAULT false,
    "payrollCode" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TimeCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TimeCategory_code_key" ON "TimeCategory"("code");
CREATE INDEX "TimeCategory_sortOrder_idx" ON "TimeCategory"("sortOrder");

CREATE TABLE "PayrollRules" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "payCycleLength" TEXT NOT NULL,
    "currentCycleStart" TEXT NOT NULL,
    "overtimeThreshold" TEXT NOT NULL,
    "longShiftFlag" TEXT NOT NULL,
    "seventhDayRule" BOOLEAN NOT NULL DEFAULT true,
    "autoApproveClean" BOOLEAN NOT NULL DEFAULT false,
    "roundClockEntries" TEXT NOT NULL,
    "requireAdminNote" BOOLEAN NOT NULL DEFAULT false,
    "gracePeriod" TEXT NOT NULL,
    "minimumShift" TEXT NOT NULL,
    "exportTo" TEXT NOT NULL,
    "lastExportLabel" TEXT NOT NULL,
    "lastExportDate" TEXT NOT NULL,
    "nextCloseLabel" TEXT NOT NULL,
    "nextCloseDate" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PayrollRules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FieldDevice" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "technician" TEXT NOT NULL,
    "truck" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "statusLabel" TEXT NOT NULL,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "queued" INTEGER NOT NULL DEFAULT 0,
    "lastSyncLabel" TEXT NOT NULL,
    "lastSyncDetail" TEXT,
    "appVersion" TEXT NOT NULL,
    "versionNote" TEXT,
    "deviceId" TEXT NOT NULL,
    "attention" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FieldDevice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FieldDevice_code_key" ON "FieldDevice"("code");
CREATE INDEX "FieldDevice_status_idx" ON "FieldDevice"("status");
CREATE INDEX "FieldDevice_sortOrder_idx" ON "FieldDevice"("sortOrder");

CREATE TABLE "FieldDeviceQueueItem" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "createdLabel" TEXT NOT NULL,
    "sizeLabel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorLabel" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "FieldDeviceQueueItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FieldDeviceQueueItem_deviceId_idx" ON "FieldDeviceQueueItem"("deviceId");
ALTER TABLE "FieldDeviceQueueItem" ADD CONSTRAINT "FieldDeviceQueueItem_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "FieldDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
