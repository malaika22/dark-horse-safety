-- Notification channel preferences and data integrations

CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "inApp" BOOLEAN NOT NULL DEFAULT false,
    "email" BOOLEAN NOT NULL DEFAULT false,
    "sms" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NotificationPreference_code_key" ON "NotificationPreference"("code");

CREATE TABLE "DataIntegration" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "badge" TEXT NOT NULL,
    "actionLabel" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DataIntegration_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DataIntegration_code_key" ON "DataIntegration"("code");
