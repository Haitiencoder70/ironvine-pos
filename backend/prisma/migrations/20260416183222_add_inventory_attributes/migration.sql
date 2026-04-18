-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "attributes" JSONB NOT NULL DEFAULT '{}';
