-- AlterTable
ALTER TABLE "product_material_templates" ADD COLUMN "inventoryItemId" TEXT;

-- CreateIndex
CREATE INDEX "product_material_templates_inventoryItemId_idx" ON "product_material_templates"("inventoryItemId");

-- AddForeignKey
ALTER TABLE "product_material_templates" ADD CONSTRAINT "product_material_templates_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
