-- Access roles and audit log

CREATE TABLE "AccessRole" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "modules" TEXT NOT NULL,
    "dashboards" TEXT NOT NULL,
    "hidden" TEXT NOT NULL,
    "accessLabel" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'SYSTEM',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AccessRole_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AccessRole_code_key" ON "AccessRole"("code");

CREATE TABLE "AccessAuditEvent" (
    "id" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "timeLabel" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "AccessAuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AccessAuditEvent_occurredAt_idx" ON "AccessAuditEvent"("occurredAt");
CREATE INDEX "AccessAuditEvent_type_idx" ON "AccessAuditEvent"("type");
CREATE INDEX "AccessAuditEvent_result_idx" ON "AccessAuditEvent"("result");
CREATE INDEX "AccessAuditEvent_actor_idx" ON "AccessAuditEvent"("actor");
