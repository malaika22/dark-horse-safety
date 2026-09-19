-- CreateEnum
CREATE TYPE "TrainingTopicKind" AS ENUM ('ALL', 'BBS', 'FIT_TEST', 'SSE', 'GENERAL');
CREATE TYPE "TrainingRecordStatus" AS ENUM ('CURRENT', 'COMPLETE', 'PENDING', 'EXPIRED', 'NEEDS_REVIEW', 'BBS_MISSING');
CREATE TYPE "TrainingVerification" AS ENUM ('VERIFIED', 'PENDING', 'REJECTED');
CREATE TYPE "TrainingAssignReason" AS ENUM ('NEW_HIRE', 'RENEWAL', 'BBS_RETRAIN');
CREATE TYPE "SsePairingStatus" AS ENUM ('ACTIVE', 'GRADUATED', 'IN_PROGRESS');

-- CreateTable
CREATE TABLE "TrainingCourse" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "TrainingTopicKind" NOT NULL DEFAULT 'GENERAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TrainingCourse_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TrainingCourse_name_key" ON "TrainingCourse"("name");

CREATE TABLE "TrainingRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "courseId" TEXT,
    "topic" TEXT NOT NULL,
    "topicCode" TEXT,
    "kind" "TrainingTopicKind" NOT NULL DEFAULT 'GENERAL',
    "completedAt" DATE,
    "expiryAt" DATE,
    "mentorId" TEXT,
    "mentorName" TEXT,
    "score" TEXT,
    "cost" TEXT,
    "issuingBody" TEXT,
    "instructor" TEXT,
    "verification" "TrainingVerification" NOT NULL DEFAULT 'PENDING',
    "status" "TrainingRecordStatus" NOT NULL DEFAULT 'PENDING',
    "certificateName" TEXT,
    "certificateSize" TEXT,
    "reminderLead" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TrainingRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TrainingRecord_employeeId_idx" ON "TrainingRecord"("employeeId");
CREATE INDEX "TrainingRecord_kind_idx" ON "TrainingRecord"("kind");
CREATE INDEX "TrainingRecord_status_idx" ON "TrainingRecord"("status");
CREATE INDEX "TrainingRecord_completedAt_idx" ON "TrainingRecord"("completedAt");

CREATE TABLE "TrainingAssignment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT,
    "courseName" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "dueDate" DATE,
    "reason" "TrainingAssignReason" NOT NULL DEFAULT 'NEW_HIRE',
    "notify" BOOLEAN NOT NULL DEFAULT true,
    "linkedSource" TEXT,
    "status" TEXT NOT NULL DEFAULT 'MISSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TrainingAssignment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TrainingAssignment_employeeId_idx" ON "TrainingAssignment"("employeeId");
CREATE INDEX "TrainingAssignment_status_idx" ON "TrainingAssignment"("status");

CREATE TABLE "TrainingCertificate" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "expiryAt" DATE,
    "verification" "TrainingVerification" NOT NULL DEFAULT 'PENDING',
    "issuingBody" TEXT,
    "fileName" TEXT,
    "fileSize" TEXT,
    "renewalReminder" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TrainingCertificate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TrainingCertificate_employeeId_idx" ON "TrainingCertificate"("employeeId");
CREATE INDEX "TrainingCertificate_verification_idx" ON "TrainingCertificate"("verification");

CREATE TABLE "SsePairing" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "menteeId" TEXT NOT NULL,
    "status" "SsePairingStatus" NOT NULL DEFAULT 'ACTIVE',
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "graduatedAt" TIMESTAMP(3),
    "evalDueLabel" TEXT,
    "evalStatus" TEXT NOT NULL DEFAULT 'DUE',
    "scorecardStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "feedbackStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "graduationLabel" TEXT,
    "decisionLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SsePairing_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SsePairing_mentorId_idx" ON "SsePairing"("mentorId");
CREATE INDEX "SsePairing_menteeId_idx" ON "SsePairing"("menteeId");
CREATE INDEX "SsePairing_status_idx" ON "SsePairing"("status");

ALTER TABLE "TrainingRecord" ADD CONSTRAINT "TrainingRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingRecord" ADD CONSTRAINT "TrainingRecord_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "TrainingCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TrainingRecord" ADD CONSTRAINT "TrainingRecord_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TrainingAssignment" ADD CONSTRAINT "TrainingAssignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "TrainingCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TrainingAssignment" ADD CONSTRAINT "TrainingAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingCertificate" ADD CONSTRAINT "TrainingCertificate_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SsePairing" ADD CONSTRAINT "SsePairing_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SsePairing" ADD CONSTRAINT "SsePairing_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
