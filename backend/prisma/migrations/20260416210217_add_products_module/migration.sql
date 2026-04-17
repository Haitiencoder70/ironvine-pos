-- CreateEnum
CREATE TYPE "GarmentType" AS ENUM ('TSHIRT', 'LONG_SLEEVE', 'HOODIE', 'SWEATSHIRT', 'POLO', 'TANK_TOP', 'JACKET', 'HAT', 'BAG', 'OTHER');

-- CreateEnum
CREATE TYPE "AddOnType" AS ENUM ('EXTRA_PRINT_LOCATION', 'RUSH_ORDER', 'NAME_CUSTOMIZATION', 'OVERSIZED_PRINT', 'PREMIUM_GARMENT', 'SPECIAL_FINISH', 'PACKAGING', 'DESIGN_SERVICE', 'OTHER');

-- AlterEnum
ALTER TYPE "PrintMethod" ADD VALUE 'NONE';

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT,
    "image" TEXT,
    "garmentType" "GarmentType" NOT NULL,
    "printMethod" "PrintMethod" NOT NULL,
    "includedPrintLocations" TEXT[],
    "maxPrintLocations" INTEGER NOT NULL DEFAULT 1,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "sizeUpcharges" JSONB,
    "priceTiers" JSONB,
    "availableBrands" TEXT[],
    "availableSizes" TEXT[],
    "availableColors" TEXT[],
    "estimatedProductionMinutes" INTEGER,
    "difficultyLevel" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_add_ons" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "AddOnType" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "printLocation" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_add_ons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_material_templates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "materialCategory" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantityPerUnit" DECIMAL(10,4) NOT NULL,
    "estimatedCostPerUnit" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_material_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_organizationId_name_key" ON "product_categories"("organizationId", "name");

-- CreateIndex
CREATE INDEX "products_organizationId_categoryId_idx" ON "products"("organizationId", "categoryId");

-- CreateIndex
CREATE INDEX "products_organizationId_isActive_idx" ON "products"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "product_add_ons_organizationId_idx" ON "product_add_ons"("organizationId");

-- CreateIndex
CREATE INDEX "product_material_templates_organizationId_idx" ON "product_material_templates"("organizationId");

-- CreateIndex
CREATE INDEX "product_material_templates_productId_idx" ON "product_material_templates"("productId");

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_add_ons" ADD CONSTRAINT "product_add_ons_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_add_ons" ADD CONSTRAINT "product_add_ons_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_material_templates" ADD CONSTRAINT "product_material_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_material_templates" ADD CONSTRAINT "product_material_templates_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
