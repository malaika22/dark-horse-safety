-- Full Add Route Rule fields
ALTER TABLE "RouteRule" ADD COLUMN IF NOT EXISTS "geofenceIsOverride" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "RouteRule" ADD COLUMN IF NOT EXISTS "clockInBeforeMin" INTEGER;
ALTER TABLE "RouteRule" ADD COLUMN IF NOT EXISTS "clockInAfterMin" INTEGER;
ALTER TABLE "RouteRule" ADD COLUMN IF NOT EXISTS "originType" TEXT;
ALTER TABLE "RouteRule" ADD COLUMN IF NOT EXISTS "originLocationId" TEXT;
ALTER TABLE "RouteRule" ADD COLUMN IF NOT EXISTS "preferredRoute" TEXT;
ALTER TABLE "RouteRule" ADD COLUMN IF NOT EXISTS "travelTimeAuto" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "RouteRule" ADD COLUMN IF NOT EXISTS "mileageRateIsOverride" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RouteRule" ADD COLUMN IF NOT EXISTS "gpsAccuracyMeters" TEXT;
ALTER TABLE "RouteRule" ADD COLUMN IF NOT EXISTS "gpsAccuracyIsOverride" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RouteRule" ADD COLUMN IF NOT EXISTS "gpsUnavailableBehavior" TEXT;
ALTER TABLE "RouteRule" ADD COLUMN IF NOT EXISTS "effectiveFrom" TIMESTAMP(3);
ALTER TABLE "RouteRule" ADD COLUMN IF NOT EXISTS "effectiveTo" TIMESTAMP(3);

DO $$ BEGIN
  ALTER TABLE "RouteRule"
    ADD CONSTRAINT "RouteRule_originLocationId_fkey"
    FOREIGN KEY ("originLocationId") REFERENCES "Location"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "RouteRule_originLocationId_idx" ON "RouteRule"("originLocationId");
