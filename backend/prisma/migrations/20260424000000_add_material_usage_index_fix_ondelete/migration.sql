-- Add organizationId index to material_usage for fast tenant-scoped queries
CREATE INDEX IF NOT EXISTS "material_usage_organizationId_idx" ON "material_usage"("organizationId");

-- Fix Order -> Customer: prevent deleting a customer who still has orders
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_customerId_fkey";
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Fix StockMovement -> Order: cascade delete stock movements when order is deleted
ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "stock_movements_orderId_fkey";
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
