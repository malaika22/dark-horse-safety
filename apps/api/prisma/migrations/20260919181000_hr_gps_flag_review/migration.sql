CREATE TYPE "HrGpsFlagType" AS ENUM ('OUTSIDE_GEOFENCE', 'LATE_CLOCK_IN');
CREATE TYPE "HrGpsFlagDecision" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'MORE_INFO');
CREATE TYPE "HrGpsNotifyVia" AS ENUM ('PUSH', 'EMAIL', 'BOTH');
CREATE TYPE "HrGpsRejectReason" AS ENUM ('INSUFFICIENT_EXPLANATION', 'POLICY_VIOLATION', 'OTHER');

CREATE TABLE "HrGpsFlag" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "HrGpsFlagType" NOT NULL,
    "eventAt" TIMESTAMP(3) NOT NULL,
    "distanceMi" DECIMAL(8,2) NOT NULL,
    "geofenceFt" INTEGER NOT NULL DEFAULT 500,
    "workOrder" TEXT,
    "customer" TEXT,
    "eventType" TEXT NOT NULL DEFAULT 'CLOCK-IN',
    "explanation" TEXT,
    "photoLabel" TEXT,
    "photoMeta" TEXT,
    "jobLat" DOUBLE PRECISION,
    "jobLng" DOUBLE PRECISION,
    "clockLat" DOUBLE PRECISION,
    "clockLng" DOUBLE PRECISION,
    "decision" "HrGpsFlagDecision" NOT NULL DEFAULT 'PENDING',
    "rejectReason" "HrGpsRejectReason",
    "decisionNotes" TEXT,
    "notifyVia" "HrGpsNotifyVia",
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HrGpsFlag_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "HrGpsFlag_employeeId_idx" ON "HrGpsFlag"("employeeId");
CREATE INDEX "HrGpsFlag_decision_idx" ON "HrGpsFlag"("decision");
CREATE INDEX "HrGpsFlag_eventAt_idx" ON "HrGpsFlag"("eventAt");
CREATE INDEX "HrGpsFlag_type_idx" ON "HrGpsFlag"("type");

ALTER TABLE "HrGpsFlag" ADD CONSTRAINT "HrGpsFlag_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
