-- Mobile sync error detail, history, contact, and reset log

ALTER TABLE "FieldDevice" ADD COLUMN "syncAge" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "FieldDevice" ADD COLUMN "phone" TEXT;
ALTER TABLE "FieldDevice" ADD COLUMN "email" TEXT;
ALTER TABLE "FieldDevice" ADD COLUMN "lastLocation" TEXT;
ALTER TABLE "FieldDevice" ADD COLUMN "crew" TEXT;
ALTER TABLE "FieldDevice" ADD COLUMN "platform" TEXT;
ALTER TABLE "FieldDevice" ADD COLUMN "connectivity" TEXT;
ALTER TABLE "FieldDevice" ADD COLUMN "sessionLabel" TEXT;
CREATE INDEX "FieldDevice_crew_idx" ON "FieldDevice"("crew");

ALTER TABLE "FieldDeviceQueueItem" ADD COLUMN "errorCode" TEXT;

CREATE TABLE "DeviceHistoryEvent" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "whenLabel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "status" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DeviceHistoryEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DeviceHistoryEvent_deviceId_idx" ON "DeviceHistoryEvent"("deviceId");
ALTER TABLE "DeviceHistoryEvent" ADD CONSTRAINT "DeviceHistoryEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "FieldDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SyncErrorCase" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "guidance" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SyncErrorCase_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SyncErrorCase_code_key" ON "SyncErrorCase"("code");

CREATE TABLE "SyncIncident" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "occurredLabel" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL,
    "statusNote" TEXT NOT NULL,
    "retryMode" TEXT NOT NULL,
    "workOrder" TEXT NOT NULL,
    "workOrderNote" TEXT,
    "queuedWith" TEXT NOT NULL,
    "deviceLine" TEXT NOT NULL,
    "discarded" BOOLEAN NOT NULL DEFAULT false,
    "discardReason" TEXT,
    CONSTRAINT "SyncIncident_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SyncIncident_code_key" ON "SyncIncident"("code");
CREATE INDEX "SyncIncident_deviceId_idx" ON "SyncIncident"("deviceId");
ALTER TABLE "SyncIncident" ADD CONSTRAINT "SyncIncident_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "FieldDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SyncIncidentItem" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "createdLabel" TEXT NOT NULL,
    "sizeLabel" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SyncIncidentItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SyncIncidentItem_incidentId_idx" ON "SyncIncidentItem"("incidentId");
ALTER TABLE "SyncIncidentItem" ADD CONSTRAINT "SyncIncidentItem_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "SyncIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SyncIncidentStep" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SyncIncidentStep_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SyncIncidentStep_incidentId_idx" ON "SyncIncidentStep"("incidentId");
ALTER TABLE "SyncIncidentStep" ADD CONSTRAINT "SyncIncidentStep_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "SyncIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SyncIncidentAttempt" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "timeLabel" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "tone" TEXT NOT NULL DEFAULT 'default',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SyncIncidentAttempt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SyncIncidentAttempt_incidentId_idx" ON "SyncIncidentAttempt"("incidentId");
ALTER TABLE "SyncIncidentAttempt" ADD CONSTRAINT "SyncIncidentAttempt_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "SyncIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DeviceReset" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeviceReset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DeviceReset_deviceId_idx" ON "DeviceReset"("deviceId");
ALTER TABLE "DeviceReset" ADD CONSTRAINT "DeviceReset_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "FieldDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
