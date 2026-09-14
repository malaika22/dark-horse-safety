-- Work order line-item snapshot + dispatch readiness timestamps
ALTER TABLE "WorkOrder" ADD COLUMN IF NOT EXISTS "amount" DECIMAL(14,2);
ALTER TABLE "WorkOrder" ADD COLUMN IF NOT EXISTS "lineItemsSnapshot" JSONB;
ALTER TABLE "WorkOrder" ADD COLUMN IF NOT EXISTS "crewAssignedAt" TIMESTAMP(3);
ALTER TABLE "WorkOrder" ADD COLUMN IF NOT EXISTS "equipmentAssignedAt" TIMESTAMP(3);
ALTER TABLE "WorkOrder" ADD COLUMN IF NOT EXISTS "formsCompletedAt" TIMESTAMP(3);
ALTER TABLE "WorkOrder" ADD COLUMN IF NOT EXISTS "eligibilityVerifiedAt" TIMESTAMP(3);
