-- Add customer-facing shipping charge fields.
ALTER TABLE "orders" ADD COLUMN "shippingAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE "shipments" ADD COLUMN "customerShippingCharge" DECIMAL(10,2);
