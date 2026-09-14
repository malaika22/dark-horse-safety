DO $$ BEGIN
  ALTER TYPE "ExpenseStatus" ADD VALUE 'DRAFT';
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN others THEN null;
END $$;

ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "attendees" JSONB;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "noReceipt" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "missingReceiptReason" TEXT;
