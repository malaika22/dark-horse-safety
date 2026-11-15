-- Access control users and teams

CREATE TABLE "AccessUser" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "lastLoginLabel" TEXT NOT NULL,
    "lastLoginDetail" TEXT NOT NULL,
    "loginAge" INTEGER NOT NULL DEFAULT 0,
    "mobileLabel" TEXT NOT NULL,
    "mobileDetail" TEXT NOT NULL,
    "mobileEnabled" BOOLEAN NOT NULL DEFAULT true,
    "mfa" TEXT NOT NULL,
    "adminAccess" BOOLEAN NOT NULL DEFAULT false,
    "inviteStatus" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "online" BOOLEAN NOT NULL DEFAULT false,
    "modules" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AccessUser_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AccessUser_code_key" ON "AccessUser"("code");
CREATE UNIQUE INDEX "AccessUser_email_key" ON "AccessUser"("email");
CREATE INDEX "AccessUser_status_idx" ON "AccessUser"("status");
CREATE INDEX "AccessUser_role_idx" ON "AccessUser"("role");
CREATE INDEX "AccessUser_team_idx" ON "AccessUser"("team");

CREATE TABLE "AccessTeam" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lead" TEXT NOT NULL,
    "members" INTEGER NOT NULL DEFAULT 0,
    "region" TEXT NOT NULL,
    "modules" TEXT NOT NULL,
    "dashboards" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "access" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "kind" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AccessTeam_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AccessTeam_code_key" ON "AccessTeam"("code");
CREATE INDEX "AccessTeam_region_idx" ON "AccessTeam"("region");
CREATE INDEX "AccessTeam_access_idx" ON "AccessTeam"("access");
