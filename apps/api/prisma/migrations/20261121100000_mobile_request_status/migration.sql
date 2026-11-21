-- Mobile API: show who reviewed an address change / location access request.
ALTER TABLE "HomeLocationChangeRequest" ADD COLUMN IF NOT EXISTS "reviewer" TEXT;
ALTER TABLE "LocationAccessRequest" ADD COLUMN IF NOT EXISTS "reviewer" TEXT;
ALTER TABLE "LocationAccessRequest" ADD COLUMN IF NOT EXISTS "decidedAt" TIMESTAMP(3);
