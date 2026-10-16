-- Align older fleet_registers columns with current Prisma schema.

-- FleetCalibration: assetId -> assetCode
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'FleetCalibration' AND column_name = 'assetId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'FleetCalibration' AND column_name = 'assetCode'
  ) THEN
    ALTER TABLE "FleetCalibration" RENAME COLUMN "assetId" TO "assetCode";
  END IF;
END $$;

-- FleetInspection: add assetCode / flags / failedItems / locationLabel; drop legacy cols
ALTER TABLE "FleetInspection" ADD COLUMN IF NOT EXISTS "assetCode" TEXT;
UPDATE "FleetInspection" SET "assetCode" = COALESCE("assetCode", "code") WHERE "assetCode" IS NULL;
ALTER TABLE "FleetInspection" ALTER COLUMN "assetCode" SET NOT NULL;

ALTER TABLE "FleetInspection" ADD COLUMN IF NOT EXISTS "flags" JSONB;
ALTER TABLE "FleetInspection" ADD COLUMN IF NOT EXISTS "failedItems" JSONB;
ALTER TABLE "FleetInspection" ADD COLUMN IF NOT EXISTS "locationLabel" TEXT;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'FleetInspection' AND column_name = 'findings'
  ) THEN
    UPDATE "FleetInspection"
    SET "failedItems" = COALESCE("failedItems", "findings")
    WHERE "failedItems" IS NULL AND "findings" IS NOT NULL;
    ALTER TABLE "FleetInspection" DROP COLUMN "findings";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'FleetInspection' AND column_name = 'itemsFailed'
  ) THEN
    ALTER TABLE "FleetInspection" DROP COLUMN "itemsFailed";
  END IF;
END $$;

-- FleetRepairRequest: add assetCode; vendor -> vendorName
ALTER TABLE "FleetRepairRequest" ADD COLUMN IF NOT EXISTS "assetCode" TEXT;
UPDATE "FleetRepairRequest" SET "assetCode" = COALESCE("assetCode", "code") WHERE "assetCode" IS NULL;
ALTER TABLE "FleetRepairRequest" ALTER COLUMN "assetCode" SET NOT NULL;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'FleetRepairRequest' AND column_name = 'vendor'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'FleetRepairRequest' AND column_name = 'vendorName'
  ) THEN
    ALTER TABLE "FleetRepairRequest" RENAME COLUMN "vendor" TO "vendorName";
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'FleetRepairRequest' AND column_name = 'vendor'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'FleetRepairRequest' AND column_name = 'vendorName'
  ) THEN
    UPDATE "FleetRepairRequest"
    SET "vendorName" = COALESCE("vendorName", "vendor")
    WHERE "vendorName" IS NULL;
    ALTER TABLE "FleetRepairRequest" DROP COLUMN "vendor";
  END IF;
END $$;
