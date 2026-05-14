-- Align Prisma schema defaults with canonical FREE trial limits from plans.ts.
-- Only affects NEW rows created without explicit values.
-- Existing org rows are not modified by this migration.

ALTER TABLE "organizations" ALTER COLUMN "maxOrders" SET DEFAULT 50;
ALTER TABLE "organizations" ALTER COLUMN "maxInventoryItems" SET DEFAULT 200;
