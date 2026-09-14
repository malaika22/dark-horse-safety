-- AlterTable
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "accountNotes" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "customerType" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "parentCompanyId" TEXT;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Customer_parentCompanyId_fkey'
  ) THEN
    ALTER TABLE "Customer"
      ADD CONSTRAINT "Customer_parentCompanyId_fkey"
      FOREIGN KEY ("parentCompanyId") REFERENCES "Customer"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Customer_parentCompanyId_idx" ON "Customer"("parentCompanyId");
CREATE INDEX IF NOT EXISTS "Customer_customerType_idx" ON "Customer"("customerType");
