-- CreateTable
CREATE TABLE IF NOT EXISTS "NetSuiteCustomerDirectory" (
    "id" TEXT NOT NULL,
    "netsuiteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "customerType" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NetSuiteCustomerDirectory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NetSuiteCustomerDirectory_netsuiteId_key" ON "NetSuiteCustomerDirectory"("netsuiteId");
CREATE INDEX IF NOT EXISTS "NetSuiteCustomerDirectory_name_idx" ON "NetSuiteCustomerDirectory"("name");
CREATE INDEX IF NOT EXISTS "Customer_netsuiteId_idx" ON "Customer"("netsuiteId");
