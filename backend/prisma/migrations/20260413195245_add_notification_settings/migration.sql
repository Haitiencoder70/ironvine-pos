/*
  Warnings:

  - You are about to drop the column `color` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `sleeveType` on the `order_items` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "order_items" DROP COLUMN "color",
DROP COLUMN "size",
DROP COLUMN "sleeveType",
ADD COLUMN     "attributes" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "required_materials" ADD COLUMN     "attributes" JSONB NOT NULL DEFAULT '{}';
