-- CreateTable
CREATE TABLE "GpsFlag" (
    "id" TEXT NOT NULL,
    "flaggedAt" TIMESTAMP(3) NOT NULL,
    "flagType" TEXT NOT NULL,
    "distanceOutside" TEXT,
    "radiusApplied" TEXT,
    "ruleSource" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "technicianId" TEXT,
    "routeRuleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GpsFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GpsFlag_locationId_idx" ON "GpsFlag"("locationId");

-- CreateIndex
CREATE INDEX "GpsFlag_customerId_idx" ON "GpsFlag"("customerId");

-- CreateIndex
CREATE INDEX "GpsFlag_flaggedAt_idx" ON "GpsFlag"("flaggedAt");

-- CreateIndex
CREATE INDEX "GpsFlag_outcome_idx" ON "GpsFlag"("outcome");

-- AddForeignKey
ALTER TABLE "GpsFlag" ADD CONSTRAINT "GpsFlag_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GpsFlag" ADD CONSTRAINT "GpsFlag_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GpsFlag" ADD CONSTRAINT "GpsFlag_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GpsFlag" ADD CONSTRAINT "GpsFlag_routeRuleId_fkey" FOREIGN KEY ("routeRuleId") REFERENCES "RouteRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
