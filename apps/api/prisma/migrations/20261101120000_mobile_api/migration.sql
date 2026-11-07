-- Mobile API: additive tables only. No existing table is altered.
CREATE TABLE IF NOT EXISTS "MobileProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "homeAddress" TEXT,
  "homeLat" DOUBLE PRECISION,
  "homeLng" DOUBLE PRECISION,
  "homeLocationSetAt" TIMESTAMP(3),
  "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MobileProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MobileProfile_userId_key" ON "MobileProfile"("userId");

CREATE TABLE IF NOT EXISTS "MobileDevice" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "pushToken" TEXT,
  "appVersion" TEXT,
  "locationPermission" TEXT,
  "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MobileDevice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MobileDevice_deviceId_key" ON "MobileDevice"("deviceId");
CREATE INDEX IF NOT EXISTS "MobileDevice_userId_idx" ON "MobileDevice"("userId");

CREATE TABLE IF NOT EXISTS "MobileOtpCode" (
  "id" TEXT NOT NULL,
  "identifier" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MobileOtpCode_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MobileOtpCode_identifier_purpose_idx" ON "MobileOtpCode"("identifier", "purpose");

CREATE TABLE IF NOT EXISTS "MobileNotification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "actionLabel" TEXT,
  "reference" JSONB,
  "requiresAction" BOOLEAN NOT NULL DEFAULT false,
  "resolved" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MobileNotification_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MobileNotification_userId_dedupeKey_key" ON "MobileNotification"("userId", "dedupeKey");
CREATE INDEX IF NOT EXISTS "MobileNotification_userId_createdAt_idx" ON "MobileNotification"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "MobileRequestLog" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "response" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MobileRequestLog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MobileRequestLog_key_key" ON "MobileRequestLog"("key");

CREATE TABLE IF NOT EXISTS "HomeLocationChangeRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "lat" DOUBLE PRECISION NOT NULL,
  "lng" DOUBLE PRECISION NOT NULL,
  "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMP(3),
  CONSTRAINT "HomeLocationChangeRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "HomeLocationChangeRequest_userId_idx" ON "HomeLocationChangeRequest"("userId");
CREATE INDEX IF NOT EXISTS "HomeLocationChangeRequest_status_idx" ON "HomeLocationChangeRequest"("status");

CREATE TABLE IF NOT EXISTS "TimeEntryPause" (
  "id" TEXT NOT NULL,
  "timeEntryId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "note" TEXT,
  "photoUrl" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TimeEntryPause_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TimeEntryPause_timeEntryId_idx" ON "TimeEntryPause"("timeEntryId");
CREATE INDEX IF NOT EXISTS "TimeEntryPause_employeeId_idx" ON "TimeEntryPause"("employeeId");

CREATE TABLE IF NOT EXISTS "SupervisorMessage" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "supervisorId" TEXT,
  "kind" TEXT NOT NULL DEFAULT 'MESSAGE',
  "subject" TEXT,
  "body" TEXT NOT NULL,
  "workOrderId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupervisorMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SupervisorMessage_employeeId_idx" ON "SupervisorMessage"("employeeId");

CREATE TABLE IF NOT EXISTS "LocationAccessRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "note" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SENT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LocationAccessRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LocationAccessRequest_employeeId_idx" ON "LocationAccessRequest"("employeeId");
