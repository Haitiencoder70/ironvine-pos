import { Prisma, GarmentType, PrintMethod, AddOnType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PriceTier {
  minQty: number;
  price: number;
}

export interface SizeUpcharges {
  [size: string]: number;
}

export interface CalculatePriceInput {
  productId: string;
  quantity: number;
  size?: string;
  selectedAddOnIds?: string[];
}

export interface CalculatePriceResult {
  basePrice: number;
  sizeUpcharge: number;
  unitPrice: number;
  addOnTotal: number;
  subtotal: number;
  estimatedCost: number;
  estimatedProfit: number;
  profitMargin: number;
  breakdown: {
    tierUsed: PriceTier | null;
    addOns: Array<{ name: string; price: number; perItem: boolean; total: number }>;
    materials: Array<{ description: string; qty: number; unitCost: number; total: number }>;
  };
}

export interface CreateProductInput {
  categoryId: string;
  name: string;
  description?: string;
  sku?: string;
  garmentType: GarmentType;
  printMethod: PrintMethod;
  includedPrintLocations?: string[];
  maxPrintLocations?: number;
  basePrice: number;
  sizeUpcharges?: SizeUpcharges;
  priceTiers?: PriceTier[];
  availableBrands?: string[];
  availableSizes?: string[];
  availableColors?: string[];
  estimatedProductionMinutes?: number;
  difficultyLevel?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  materialTemplates?: Array<{
    materialCategory: string;
    description: string;
    quantityPerUnit: number;
    estimatedCostPerUnit: number;
    notes?: string;
  }>;
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
  icon?: string;
  displayOrder?: number;
}

export interface CreateAddOnInput {
  productId?: string;
  name: string;
  description?: string;
  type: AddOnType;
  price: number;
  printLocation?: string;
  isActive?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

function resolveTierPrice(tiers: PriceTier[], quantity: number): PriceTier | null {
  if (!tiers || tiers.length === 0) return null;
  const sorted = [...tiers].sort((a, b) => b.minQty - a.minQty);
  return sorted.find((t) => quantity >= t.minQty) ?? sorted[sorted.length - 1];
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getProductCategories(organizationId: string) {
  await seedDefaultProducts(organizationId);
  return prisma.productCategory.findMany({
    where: { organizationId, isActive: true },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { products: true } },
    },
  });
}

export async function createProductCategory(organizationId: string, data: CreateCategoryInput) {
  return prisma.productCategory.create({
    data: { ...data, organizationId },
  });
}

export async function updateProductCategory(
  organizationId: string,
  categoryId: string,
  data: Partial<CreateCategoryInput> & { isActive?: boolean },
) {
  const existing = await prisma.productCategory.findFirst({
    where: { id: categoryId, organizationId },
  });
  if (!existing) throw new AppError(404, 'Category not found');

  return prisma.productCategory.update({ where: { id: categoryId }, data });
}

export async function deleteProductCategory(organizationId: string, categoryId: string) {
  const existing = await prisma.productCategory.findFirst({
    where: { id: categoryId, organizationId },
  });
  if (!existing) throw new AppError(404, 'Category not found');

  const productCount = await prisma.product.count({
    where: { categoryId, organizationId, isActive: true },
  });
  if (productCount > 0) throw new AppError(400, 'Cannot delete category with active products');

  return prisma.productCategory.update({
    where: { id: categoryId },
    data: { isActive: false },
  });
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function getProducts(
  organizationId: string,
  filters: {
    categoryId?: string;
    garmentType?: GarmentType;
    printMethod?: PrintMethod;
    isActive?: boolean;
    search?: string;
    isFeatured?: boolean;
  } = {},
) {
  const where: Prisma.ProductWhereInput = {
    organizationId,
    isActive: filters.isActive !== undefined ? filters.isActive : true,
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.garmentType ? { garmentType: filters.garmentType } : {}),
    ...(filters.printMethod ? { printMethod: filters.printMethod } : {}),
    ...(filters.isFeatured !== undefined ? { isFeatured: filters.isFeatured } : {}),
    ...(filters.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
            { sku: { contains: filters.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  return prisma.product.findMany({
    where,
    orderBy: [{ category: { displayOrder: 'asc' } }, { name: 'asc' }],
    include: {
      category: true,
      addOns: { where: { isActive: true } },
    },
  });
}

export async function getProductById(organizationId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, organizationId },
    include: {
      category: true,
      addOns: { where: { isActive: true } },
      materialTemplates: true,
    },
  });
  if (!product) throw new AppError(404, 'Product not found');
  return product;
}

export async function createProduct(organizationId: string, data: CreateProductInput) {
  const {
    materialTemplates,
    basePrice,
    sizeUpcharges,
    priceTiers,
    categoryId,
    ...rest
  } = data;

  const category = await prisma.productCategory.findFirst({
    where: { id: categoryId, organizationId },
  });
  if (!category) throw new AppError(404, 'Category not found');

  return prisma.product.create({
    data: {
      ...rest,
      organizationId,
      categoryId,
      basePrice: new Prisma.Decimal(basePrice),
      sizeUpcharges: sizeUpcharges ? toJson(sizeUpcharges) : Prisma.JsonNull,
      priceTiers: priceTiers ? toJson(priceTiers) : Prisma.JsonNull,
      materialTemplates: materialTemplates
        ? {
            create: materialTemplates.map((t) => ({
              ...t,
              materialCategory: 'GENERAL',
              organizationId,
              quantityPerUnit: new Prisma.Decimal(t.quantityPerUnit),
              estimatedCostPerUnit: new Prisma.Decimal(t.estimatedCostPerUnit),
            })),
          }
        : undefined,
    },
    include: {
      category: true,
      addOns: true,
      materialTemplates: true,
    },
  });
}

export async function updateProduct(
  organizationId: string,
  productId: string,
  data: Partial<CreateProductInput>,
) {
  const existing = await prisma.product.findFirst({
    where: { id: productId, organizationId },
  });
  if (!existing) throw new AppError(404, 'Product not found');

  const {
    materialTemplates,
    basePrice,
    sizeUpcharges,
    priceTiers,
    categoryId,
    ...rest
  } = data;

  const updateData: Prisma.ProductUpdateInput = {
    ...rest,
    ...(categoryId !== undefined ? { category: { connect: { id: categoryId } } } : {}),
    ...(basePrice !== undefined ? { basePrice: new Prisma.Decimal(basePrice) } : {}),
    ...(sizeUpcharges !== undefined ? { sizeUpcharges: toJson(sizeUpcharges) } : {}),
    ...(priceTiers !== undefined ? { priceTiers: toJson(priceTiers) } : {}),
  };

  if (materialTemplates) {
    await prisma.productMaterialTemplate.deleteMany({ where: { productId, organizationId } });
    updateData.materialTemplates = {
      create: materialTemplates.map((t) => ({
        ...t,
        materialCategory: 'GENERAL',
        organizationId,
        quantityPerUnit: new Prisma.Decimal(t.quantityPerUnit),
        estimatedCostPerUnit: new Prisma.Decimal(t.estimatedCostPerUnit),
      })),
    };
  }

  return prisma.product.update({
    where: { id: productId },
    data: updateData,
    include: {
      category: true,
      addOns: { where: { isActive: true } },
      materialTemplates: true,
    },
  });
}

export async function softDeleteProduct(organizationId: string, productId: string) {
  const existing = await prisma.product.findFirst({
    where: { id: productId, organizationId },
  });
  if (!existing) throw new AppError(404, 'Product not found');

  return prisma.product.update({ where: { id: productId }, data: { isActive: false } });
}

export async function duplicateProduct(organizationId: string, productId: string) {
  const source = await prisma.product.findFirst({
    where: { id: productId, organizationId },
    include: { materialTemplates: true },
  });
  if (!source) throw new AppError(404, 'Product not found');

  return prisma.product.create({
    data: {
      organizationId,
      categoryId: source.categoryId,
      name: `${source.name} (Copy)`,
      description: source.description,
      sku: source.sku,
      garmentType: source.garmentType,
      printMethod: source.printMethod,
      includedPrintLocations: source.includedPrintLocations,
      maxPrintLocations: source.maxPrintLocations,
      basePrice: source.basePrice,
      sizeUpcharges: source.sizeUpcharges ?? Prisma.JsonNull,
      priceTiers: source.priceTiers ?? Prisma.JsonNull,
      availableBrands: source.availableBrands,
      availableSizes: source.availableSizes,
      availableColors: source.availableColors,
      estimatedProductionMinutes: source.estimatedProductionMinutes,
      difficultyLevel: source.difficultyLevel,
      isActive: false,
      isFeatured: false,
      materialTemplates: {
        create: source.materialTemplates.map(({ id: _id, createdAt: _c, updatedAt: _u, productId: _p, ...t }) => ({
          ...t,
        })),
      },
    },
    include: {
      category: true,
      addOns: true,
      materialTemplates: true,
    },
  });
}

// ─── Price Calculation ────────────────────────────────────────────────────────

export async function calculatePrice(
  organizationId: string,
  input: CalculatePriceInput,
): Promise<CalculatePriceResult> {
  const product = await prisma.product.findFirst({
    where: { id: input.productId, organizationId },
    include: { materialTemplates: true },
  });
  if (!product) throw new AppError(404, 'Product not found');

  const tiers = (product.priceTiers as unknown as PriceTier[]) ?? [];
  const upcharges = (product.sizeUpcharges as unknown as SizeUpcharges) ?? {};

  const tierUsed = resolveTierPrice(tiers, input.quantity);
  const basePrice = tierUsed ? tierUsed.price : Number(product.basePrice);
  const sizeUpcharge = input.size ? (upcharges[input.size] ?? 0) : 0;
  const unitPrice = basePrice + sizeUpcharge;

  let addOnTotal = 0;
  const addOnBreakdown: CalculatePriceResult['breakdown']['addOns'] = [];

  if (input.selectedAddOnIds && input.selectedAddOnIds.length > 0) {
    const addOns = await prisma.productAddOn.findMany({
      where: { id: { in: input.selectedAddOnIds }, organizationId, isActive: true },
    });

    for (const addOn of addOns) {
      const price = Number(addOn.price);
      const isFlat = addOn.type === 'DESIGN_SERVICE';
      const total = isFlat ? price : price * input.quantity;
      addOnTotal += total;
      addOnBreakdown.push({ name: addOn.name, price, perItem: !isFlat, total });
    }
  }

  const subtotal = unitPrice * input.quantity + addOnTotal;

  let estimatedCost = 0;
  const materialBreakdown: CalculatePriceResult['breakdown']['materials'] = [];

  for (const t of product.materialTemplates) {
    const qty = Number(t.quantityPerUnit) * input.quantity;
    const unitCost = Number(t.estimatedCostPerUnit);
    const total = qty * unitCost;
    estimatedCost += total;
    materialBreakdown.push({ description: t.description, qty, unitCost, total });
  }

  const estimatedProfit = subtotal - estimatedCost;
  const profitMargin = subtotal > 0 ? (estimatedProfit / subtotal) * 100 : 0;

  return {
    basePrice,
    sizeUpcharge,
    unitPrice,
    addOnTotal,
    subtotal,
    estimatedCost,
    estimatedProfit,
    profitMargin: Math.round(profitMargin * 10) / 10,
    breakdown: { tierUsed, addOns: addOnBreakdown, materials: materialBreakdown },
  };
}

// ─── Add-Ons ──────────────────────────────────────────────────────────────────

export async function getProductAddOns(organizationId: string, productId?: string) {
  return prisma.productAddOn.findMany({
    where: {
      organizationId,
      isActive: true,
      ...(productId ? { OR: [{ productId }, { productId: null }] } : {}),
    },
    orderBy: { name: 'asc' },
  });
}

export async function createProductAddOn(organizationId: string, data: CreateAddOnInput) {
  if (data.productId) {
    const product = await prisma.product.findFirst({
      where: { id: data.productId, organizationId },
    });
    if (!product) throw new AppError(404, 'Product not found');
  }

  return prisma.productAddOn.create({
    data: { ...data, organizationId, price: new Prisma.Decimal(data.price) },
  });
}

export async function updateProductAddOn(
  organizationId: string,
  addOnId: string,
  data: Partial<CreateAddOnInput>,
) {
  const existing = await prisma.productAddOn.findFirst({
    where: { id: addOnId, organizationId },
  });
  if (!existing) throw new AppError(404, 'Add-on not found');

  return prisma.productAddOn.update({
    where: { id: addOnId },
    data: {
      ...data,
      ...(data.price !== undefined ? { price: new Prisma.Decimal(data.price) } : {}),
    },
  });
}

export async function deleteProductAddOn(organizationId: string, addOnId: string) {
  const existing = await prisma.productAddOn.findFirst({
    where: { id: addOnId, organizationId },
  });
  if (!existing) throw new AppError(404, 'Add-on not found');

  return prisma.productAddOn.update({ where: { id: addOnId }, data: { isActive: false } });
}

// ─── Seed Defaults ────────────────────────────────────────────────────────────

export async function seedDefaultProducts(organizationId: string) {
  const existing = await prisma.productCategory.count({ where: { organizationId } });
  if (existing > 0) return;

  type ProductSeed = {
    name: string;
    description?: string;
    garmentType: GarmentType;
    printMethod: PrintMethod;
    includedPrintLocations: string[];
    maxPrintLocations: number;
    basePrice: number;
    sizeUpcharges?: SizeUpcharges;
    priceTiers: PriceTier[];
    availableBrands: string[];
    availableSizes: string[];
    estimatedProductionMinutes?: number;
    difficultyLevel?: string;
    materials: Array<{ materialCategory: string; description: string; quantityPerUnit: number; estimatedCostPerUnit: number }>;
  };

  const categories: Array<{
    name: string;
    icon: string;
    displayOrder: number;
    products: ProductSeed[];
  }> = [
    {
      name: 'T-Shirts',
      icon: '👕',
      displayOrder: 1,
      products: [
        {
          name: 'DTF T-Shirt - Front Print',
          garmentType: 'TSHIRT',
          printMethod: 'DTF',
          includedPrintLocations: ['Front'],
          maxPrintLocations: 1,
          basePrice: 18.0,
          sizeUpcharges: { '2XL': 2.0, '3XL': 3.0, '4XL': 4.0, '5XL': 5.0 },
          priceTiers: [
            { minQty: 1, price: 18.0 },
            { minQty: 12, price: 16.0 },
            { minQty: 25, price: 15.0 },
            { minQty: 50, price: 13.0 },
            { minQty: 100, price: 11.0 },
            { minQty: 250, price: 9.5 },
          ],
          availableBrands: ['gildan', 'bella-canvas', 'next-level', 'comfort-colors'],
          availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'],
          estimatedProductionMinutes: 5,
          difficultyLevel: 'easy',
          materials: [
            { materialCategory: 'BLANK_GARMENT', description: 'Blank T-Shirt (matching brand/size/color)', quantityPerUnit: 1, estimatedCostPerUnit: 3.5 },
            { materialCategory: 'DTF_TRANSFER', description: 'DTF Transfer - Front', quantityPerUnit: 1, estimatedCostPerUnit: 3.0 },
          ],
        },
        {
          name: 'DTF T-Shirt - Front & Back',
          garmentType: 'TSHIRT',
          printMethod: 'DTF',
          includedPrintLocations: ['Front', 'Back'],
          maxPrintLocations: 2,
          basePrice: 25.0,
          sizeUpcharges: { '2XL': 2.0, '3XL': 3.0, '4XL': 4.0, '5XL': 5.0 },
          priceTiers: [
            { minQty: 1, price: 25.0 },
            { minQty: 12, price: 22.0 },
            { minQty: 25, price: 20.0 },
            { minQty: 50, price: 18.0 },
            { minQty: 100, price: 15.0 },
            { minQty: 250, price: 13.0 },
          ],
          availableBrands: ['gildan', 'bella-canvas', 'next-level', 'comfort-colors'],
          availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'],
          estimatedProductionMinutes: 8,
          difficultyLevel: 'easy',
          materials: [
            { materialCategory: 'BLANK_GARMENT', description: 'Blank T-Shirt (matching brand/size/color)', quantityPerUnit: 1, estimatedCostPerUnit: 3.5 },
            { materialCategory: 'DTF_TRANSFER', description: 'DTF Transfer - Front & Back', quantityPerUnit: 2, estimatedCostPerUnit: 3.0 },
          ],
        },
        {
          name: 'HTV T-Shirt - Left Chest',
          garmentType: 'TSHIRT',
          printMethod: 'HTV',
          includedPrintLocations: ['Front Left Chest'],
          maxPrintLocations: 1,
          basePrice: 15.0,
          sizeUpcharges: { '2XL': 2.0, '3XL': 3.0, '4XL': 4.0, '5XL': 5.0 },
          priceTiers: [
            { minQty: 1, price: 15.0 },
            { minQty: 12, price: 13.0 },
            { minQty: 25, price: 12.0 },
            { minQty: 50, price: 10.0 },
          ],
          availableBrands: ['gildan', 'bella-canvas', 'next-level'],
          availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'],
          estimatedProductionMinutes: 4,
          difficultyLevel: 'easy',
          materials: [
            { materialCategory: 'BLANK_GARMENT', description: 'Blank T-Shirt (matching brand/size/color)', quantityPerUnit: 1, estimatedCostPerUnit: 3.5 },
            { materialCategory: 'HTV_VINYL', description: 'HTV Vinyl (approx. 4"x4")', quantityPerUnit: 1, estimatedCostPerUnit: 1.5 },
          ],
        },
        {
          name: 'HTV T-Shirt - Front Print',
          garmentType: 'TSHIRT',
          printMethod: 'HTV',
          includedPrintLocations: ['Front'],
          maxPrintLocations: 1,
          basePrice: 18.0,
          sizeUpcharges: { '2XL': 2.0, '3XL': 3.0, '4XL': 4.0, '5XL': 5.0 },
          priceTiers: [
            { minQty: 1, price: 18.0 },
            { minQty: 12, price: 16.0 },
            { minQty: 25, price: 14.0 },
            { minQty: 50, price: 12.0 },
          ],
          availableBrands: ['gildan', 'bella-canvas', 'next-level'],
          availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'],
          estimatedProductionMinutes: 6,
          difficultyLevel: 'medium',
          materials: [
            { materialCategory: 'BLANK_GARMENT', description: 'Blank T-Shirt (matching brand/size/color)', quantityPerUnit: 1, estimatedCostPerUnit: 3.5 },
            { materialCategory: 'HTV_VINYL', description: 'HTV Vinyl (approx. 12"x12")', quantityPerUnit: 1, estimatedCostPerUnit: 3.0 },
          ],
        },
        {
          name: 'HTV T-Shirt - Front & Back',
          garmentType: 'TSHIRT',
          printMethod: 'HTV',
          includedPrintLocations: ['Front', 'Back'],
          maxPrintLocations: 2,
          basePrice: 25.0,
          sizeUpcharges: { '2XL': 2.0, '3XL': 3.0, '4XL': 4.0, '5XL': 5.0 },
          priceTiers: [
            { minQty: 1, price: 25.0 },
            { minQty: 12, price: 22.0 },
            { minQty: 25, price: 19.0 },
            { minQty: 50, price: 16.0 },
          ],
          availableBrands: ['gildan', 'bella-canvas', 'next-level'],
          availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'],
          estimatedProductionMinutes: 10,
          difficultyLevel: 'medium',
          materials: [
            { materialCategory: 'BLANK_GARMENT', description: 'Blank T-Shirt (matching brand/size/color)', quantityPerUnit: 1, estimatedCostPerUnit: 3.5 },
            { materialCategory: 'HTV_VINYL', description: 'HTV Vinyl - Front & Back', quantityPerUnit: 2, estimatedCostPerUnit: 3.0 },
          ],
        },
        {
          name: 'DTF T-Shirt - Full Print (Front, Back, Sleeves)',
          garmentType: 'TSHIRT',
          printMethod: 'DTF',
          includedPrintLocations: ['Front', 'Back', 'Left Sleeve', 'Right Sleeve'],
          maxPrintLocations: 4,
          basePrice: 35.0,
          sizeUpcharges: { '2XL': 2.0, '3XL': 3.0, '4XL': 4.0, '5XL': 5.0 },
          priceTiers: [
            { minQty: 1, price: 35.0 },
            { minQty: 25, price: 30.0 },
            { minQty: 50, price: 25.0 },
            { minQty: 100, price: 22.0 },
          ],
          availableBrands: ['gildan', 'bella-canvas', 'next-level', 'comfort-colors'],
          availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'],
          estimatedProductionMinutes: 15,
          difficultyLevel: 'complex',
          materials: [
            { materialCategory: 'BLANK_GARMENT', description: 'Blank T-Shirt (matching brand/size/color)', quantityPerUnit: 1, estimatedCostPerUnit: 3.5 },
            { materialCategory: 'DTF_TRANSFER', description: 'DTF Transfers - Front, Back, Sleeves', quantityPerUnit: 4, estimatedCostPerUnit: 3.0 },
          ],
        },
        {
          name: 'Blank T-Shirt (No Print)',
          garmentType: 'TSHIRT',
          printMethod: 'NONE',
          includedPrintLocations: [],
          maxPrintLocations: 0,
          basePrice: 8.0,
          priceTiers: [
            { minQty: 1, price: 8.0 },
            { minQty: 25, price: 7.0 },
            { minQty: 50, price: 6.0 },
          ],
          availableBrands: ['gildan', 'bella-canvas', 'next-level', 'comfort-colors'],
          availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'],
          estimatedProductionMinutes: 1,
          difficultyLevel: 'easy',
          materials: [
            { materialCategory: 'BLANK_GARMENT', description: 'Blank T-Shirt (matching brand/size/color)', quantityPerUnit: 1, estimatedCostPerUnit: 3.5 },
          ],
        },
      ],
    },
    {
      name: 'Long Sleeve T-Shirts',
      icon: '👔',
      displayOrder: 2,
      products: [
        {
          name: 'DTF Long Sleeve - Front Print',
          garmentType: 'LONG_SLEEVE',
          printMethod: 'DTF',
          includedPrintLocations: ['Front'],
          maxPrintLocations: 1,
          basePrice: 22.0,
          sizeUpcharges: { '2XL': 2.0, '3XL': 3.0, '4XL': 4.0 },
          priceTiers: [
            { minQty: 1, price: 22.0 },
            { minQty: 12, price: 20.0 },
            { minQty: 25, price: 18.0 },
            { minQty: 50, price: 16.0 },
          ],
          availableBrands: ['gildan', 'bella-canvas', 'next-level'],
          availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
          estimatedProductionMinutes: 6,
          difficultyLevel: 'easy',
          materials: [
            { materialCategory: 'BLANK_GARMENT', description: 'Blank Long Sleeve T-Shirt', quantityPerUnit: 1, estimatedCostPerUnit: 6.0 },
            { materialCategory: 'DTF_TRANSFER', description: 'DTF Transfer - Front', quantityPerUnit: 1, estimatedCostPerUnit: 3.0 },
          ],
        },
        {
          name: 'DTF Long Sleeve - Front & Back',
          garmentType: 'LONG_SLEEVE',
          printMethod: 'DTF',
          includedPrintLocations: ['Front', 'Back'],
          maxPrintLocations: 2,
          basePrice: 30.0,
          sizeUpcharges: { '2XL': 2.0, '3XL': 3.0, '4XL': 4.0 },
          priceTiers: [
            { minQty: 1, price: 30.0 },
            { minQty: 12, price: 27.0 },
            { minQty: 25, price: 24.0 },
            { minQty: 50, price: 21.0 },
          ],
          availableBrands: ['gildan', 'bella-canvas', 'next-level'],
          availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
          estimatedProductionMinutes: 10,
          difficultyLevel: 'easy',
          materials: [
            { materialCategory: 'BLANK_GARMENT', description: 'Blank Long Sleeve T-Shirt', quantityPerUnit: 1, estimatedCostPerUnit: 6.0 },
            { materialCategory: 'DTF_TRANSFER', description: 'DTF Transfer - Front & Back', quantityPerUnit: 2, estimatedCostPerUnit: 3.0 },
          ],
        },
        {
          name: 'HTV Long Sleeve - Left Chest',
          garmentType: 'LONG_SLEEVE',
          printMethod: 'HTV',
          includedPrintLocations: ['Front Left Chest'],
          maxPrintLocations: 1,
          basePrice: 20.0,
          sizeUpcharges: { '2XL': 2.0, '3XL': 3.0 },
          priceTiers: [
            { minQty: 1, price: 20.0 },
            { minQty: 12, price: 18.0 },
            { minQty: 25, price: 16.0 },
          ],
          availableBrands: ['gildan', 'bella-canvas'],
          availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
          estimatedProductionMinutes: 5,
          difficultyLevel: 'easy',
          materials: [
            { materialCategory: 'BLANK_GARMENT', description: 'Blank Long Sleeve T-Shirt', quantityPerUnit: 1, estimatedCostPerUnit: 6.0 },
            { materialCategory: 'HTV_VINYL', description: 'HTV Vinyl (approx. 4"x4")', quantityPerUnit: 1, estimatedCostPerUnit: 1.5 },
          ],
        },
      ],
    },
    {
      name: 'Hoodies',
      icon: '🧥',
      displayOrder: 3,
      products: [
        {
          name: 'DTF Hoodie - Front Print',
          garmentType: 'HOODIE',
          printMethod: 'DTF',
          includedPrintLocations: ['Front'],
          maxPrintLocations: 1,
          basePrice: 35.0,
          sizeUpcharges: { '2XL': 3.0, '3XL': 4.0 },
          priceTiers: [
            { minQty: 1, price: 35.0 },
            { minQty: 12, price: 32.0 },
            { minQty: 25, price: 28.0 },
            { minQty: 50, price: 25.0 },
          ],
          availableBrands: ['gildan', 'bella-canvas', 'comfort-colors'],
          availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
          estimatedProductionMinutes: 8,
          difficultyLevel: 'easy',
          materials: [
            { materialCategory: 'BLANK_GARMENT', description: 'Blank Hoodie', quantityPerUnit: 1, estimatedCostPerUnit: 12.0 },
            { materialCategory: 'DTF_TRANSFER', description: 'DTF Transfer - Front', quantityPerUnit: 1, estimatedCostPerUnit: 4.0 },
          ],
        },
        {
          name: 'DTF Hoodie - Front & Back',
          garmentType: 'HOODIE',
          printMethod: 'DTF',
          includedPrintLocations: ['Front', 'Back'],
          maxPrintLocations: 2,
          basePrice: 42.0,
          sizeUpcharges: { '2XL': 3.0, '3XL': 4.0 },
          priceTiers: [
            { minQty: 1, price: 42.0 },
            { minQty: 12, price: 38.0 },
            { minQty: 25, price: 34.0 },
            { minQty: 50, price: 30.0 },
          ],
          availableBrands: ['gildan', 'bella-canvas', 'comfort-colors'],
          availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
          estimatedProductionMinutes: 12,
          difficultyLevel: 'easy',
          materials: [
            { materialCategory: 'BLANK_GARMENT', description: 'Blank Hoodie', quantityPerUnit: 1, estimatedCostPerUnit: 12.0 },
            { materialCategory: 'DTF_TRANSFER', description: 'DTF Transfer - Front & Back', quantityPerUnit: 2, estimatedCostPerUnit: 4.0 },
          ],
        },
        {
          name: 'HTV Hoodie - Left Chest',
          garmentType: 'HOODIE',
          printMethod: 'HTV',
          includedPrintLocations: ['Front Left Chest'],
          maxPrintLocations: 1,
          basePrice: 30.0,
          sizeUpcharges: { '2XL': 3.0, '3XL': 4.0 },
          priceTiers: [
            { minQty: 1, price: 30.0 },
            { minQty: 12, price: 27.0 },
            { minQty: 25, price: 24.0 },
          ],
          availableBrands: ['gildan', 'bella-canvas'],
          availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
          estimatedProductionMinutes: 6,
          difficultyLevel: 'easy',
          materials: [
            { materialCategory: 'BLANK_GARMENT', description: 'Blank Hoodie', quantityPerUnit: 1, estimatedCostPerUnit: 12.0 },
            { materialCategory: 'HTV_VINYL', description: 'HTV Vinyl (approx. 4"x4")', quantityPerUnit: 1, estimatedCostPerUnit: 1.5 },
          ],
        },
        {
          name: 'HTV Hoodie - Front Print',
          garmentType: 'HOODIE',
          printMethod: 'HTV',
          includedPrintLocations: ['Front'],
          maxPrintLocations: 1,
          basePrice: 35.0,
          sizeUpcharges: { '2XL': 3.0, '3XL': 4.0 },
          priceTiers: [
            { minQty: 1, price: 35.0 },
            { minQty: 12, price: 31.0 },
            { minQty: 25, price: 27.0 },
          ],
          availableBrands: ['gildan', 'bella-canvas'],
          availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
          estimatedProductionMinutes: 8,
          difficultyLevel: 'medium',
          materials: [
            { materialCategory: 'BLANK_GARMENT', description: 'Blank Hoodie', quantityPerUnit: 1, estimatedCostPerUnit: 12.0 },
            { materialCategory: 'HTV_VINYL', description: 'HTV Vinyl - Front', quantityPerUnit: 1, estimatedCostPerUnit: 3.0 },
          ],
        },
      ],
    },
    {
      name: 'Sweatshirts',
      icon: '🧶',
      displayOrder: 4,
      products: [
        {
          name: 'DTF Crewneck Sweatshirt - Front Print',
          garmentType: 'SWEATSHIRT',
          printMethod: 'DTF',
          includedPrintLocations: ['Front'],
          maxPrintLocations: 1,
          basePrice: 32.0,
          sizeUpcharges: { '2XL': 3.0, '3XL': 4.0 },
          priceTiers: [
            { minQty: 1, price: 32.0 },
            { minQty: 12, price: 28.0 },
            { minQty: 25, price: 25.0 },
            { minQty: 50, price: 22.0 },
          ],
          availableBrands: ['gildan', 'bella-canvas'],
          availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
          estimatedProductionMinutes: 7,
          difficultyLevel: 'easy',
          materials: [
            { materialCategory: 'BLANK_GARMENT', description: 'Blank Crewneck Sweatshirt', quantityPerUnit: 1, estimatedCostPerUnit: 10.0 },
            { materialCategory: 'DTF_TRANSFER', description: 'DTF Transfer - Front', quantityPerUnit: 1, estimatedCostPerUnit: 3.5 },
          ],
        },
        {
          name: 'DTF Crewneck Sweatshirt - Front & Back',
          garmentType: 'SWEATSHIRT',
          printMethod: 'DTF',
          includedPrintLocations: ['Front', 'Back'],
          maxPrintLocations: 2,
          basePrice: 40.0,
          sizeUpcharges: { '2XL': 3.0, '3XL': 4.0 },
          priceTiers: [
            { minQty: 1, price: 40.0 },
            { minQty: 12, price: 36.0 },
            { minQty: 25, price: 32.0 },
            { minQty: 50, price: 28.0 },
          ],
          availableBrands: ['gildan', 'bella-canvas'],
          availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
          estimatedProductionMinutes: 11,
          difficultyLevel: 'easy',
          materials: [
            { materialCategory: 'BLANK_GARMENT', description: 'Blank Crewneck Sweatshirt', quantityPerUnit: 1, estimatedCostPerUnit: 10.0 },
            { materialCategory: 'DTF_TRANSFER', description: 'DTF Transfer - Front & Back', quantityPerUnit: 2, estimatedCostPerUnit: 3.5 },
          ],
        },
      ],
    },
    {
      name: 'Polo Shirts',
      icon: '👔',
      displayOrder: 5,
      products: [
        {
          name: 'HTV Polo - Left Chest',
          garmentType: 'POLO',
          printMethod: 'HTV',
          includedPrintLocations: ['Front Left Chest'],
          maxPrintLocations: 1,
          basePrice: 22.0,
          sizeUpcharges: { '2XL': 2.0, '3XL': 3.0 },
          priceTiers: [
            { minQty: 1, price: 22.0 },
            { minQty: 12, price: 20.0 },
            { minQty: 25, price: 18.0 },
          ],
          availableBrands: ['gildan', 'port-authority'],
          availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
          estimatedProductionMinutes: 5,
          difficultyLevel: 'easy',
          materials: [
            { materialCategory: 'BLANK_GARMENT', description: 'Blank Polo Shirt', quantityPerUnit: 1, estimatedCostPerUnit: 8.0 },
            { materialCategory: 'HTV_VINYL', description: 'HTV Vinyl (approx. 4"x4")', quantityPerUnit: 1, estimatedCostPerUnit: 1.5 },
          ],
        },
        {
          name: 'Embroidered Polo - Left Chest',
          garmentType: 'POLO',
          printMethod: 'EMBROIDERY',
          includedPrintLocations: ['Front Left Chest'],
          maxPrintLocations: 1,
          basePrice: 28.0,
          sizeUpcharges: { '2XL': 2.0, '3XL': 3.0 },
          priceTiers: [
            { minQty: 1, price: 28.0 },
            { minQty: 12, price: 25.0 },
            { minQty: 25, price: 22.0 },
          ],
          availableBrands: ['gildan', 'port-authority'],
          availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
          estimatedProductionMinutes: 15,
          difficultyLevel: 'complex',
          materials: [
            { materialCategory: 'BLANK_GARMENT', description: 'Blank Polo Shirt', quantityPerUnit: 1, estimatedCostPerUnit: 8.0 },
            { materialCategory: 'EMBROIDERY_THREAD', description: 'Embroidery Thread', quantityPerUnit: 1, estimatedCostPerUnit: 2.0 },
          ],
        },
      ],
    },
    {
      name: 'Tank Tops',
      icon: '🎽',
      displayOrder: 6,
      products: [
        {
          name: 'DTF Tank Top - Front Print',
          garmentType: 'TANK_TOP',
          printMethod: 'DTF',
          includedPrintLocations: ['Front'],
          maxPrintLocations: 1,
          basePrice: 16.0,
          sizeUpcharges: { '2XL': 2.0, '3XL': 3.0 },
          priceTiers: [
            { minQty: 1, price: 16.0 },
            { minQty: 12, price: 14.0 },
            { minQty: 25, price: 13.0 },
            { minQty: 50, price: 11.0 },
          ],
          availableBrands: ['gildan', 'bella-canvas', 'next-level'],
          availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
          estimatedProductionMinutes: 5,
          difficultyLevel: 'easy',
          materials: [
            { materialCategory: 'BLANK_GARMENT', description: 'Blank Tank Top', quantityPerUnit: 1, estimatedCostPerUnit: 3.0 },
            { materialCategory: 'DTF_TRANSFER', description: 'DTF Transfer - Front', quantityPerUnit: 1, estimatedCostPerUnit: 3.0 },
          ],
        },
        {
          name: 'DTF Tank Top - Front & Back',
          garmentType: 'TANK_TOP',
          printMethod: 'DTF',
          includedPrintLocations: ['Front', 'Back'],
          maxPrintLocations: 2,
          basePrice: 22.0,
          sizeUpcharges: { '2XL': 2.0, '3XL': 3.0 },
          priceTiers: [
            { minQty: 1, price: 22.0 },
            { minQty: 12, price: 19.0 },
            { minQty: 25, price: 17.0 },
            { minQty: 50, price: 15.0 },
          ],
          availableBrands: ['gildan', 'bella-canvas', 'next-level'],
          availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
          estimatedProductionMinutes: 8,
          difficultyLevel: 'easy',
          materials: [
            { materialCategory: 'BLANK_GARMENT', description: 'Blank Tank Top', quantityPerUnit: 1, estimatedCostPerUnit: 3.0 },
            { materialCategory: 'DTF_TRANSFER', description: 'DTF Transfer - Front & Back', quantityPerUnit: 2, estimatedCostPerUnit: 3.0 },
          ],
        },
      ],
    },
    {
      name: 'Youth/Kids',
      icon: '👶',
      displayOrder: 7,
      products: [
        {
          name: 'DTF Youth T-Shirt - Front Print',
          garmentType: 'TSHIRT',
          printMethod: 'DTF',
          includedPrintLocations: ['Front'],
          maxPrintLocations: 1,
          basePrice: 15.0,
          priceTiers: [
            { minQty: 1, price: 15.0 },
            { minQty: 12, price: 13.0 },
            { minQty: 25, price: 12.0 },
            { minQty: 50, price: 10.0 },
          ],
          availableBrands: ['gildan', 'bella-canvas', 'next-level'],
          availableSizes: ['YXS', 'YS', 'YM', 'YL', 'YXL'],
          estimatedProductionMinutes: 5,
          difficultyLevel: 'easy',
          materials: [
            { materialCategory: 'BLANK_GARMENT', description: 'Blank Youth T-Shirt', quantityPerUnit: 1, estimatedCostPerUnit: 2.5 },
            { materialCategory: 'DTF_TRANSFER', description: 'DTF Transfer - Front', quantityPerUnit: 1, estimatedCostPerUnit: 2.5 },
          ],
        },
        {
          name: 'DTF Youth T-Shirt - Front & Back',
          garmentType: 'TSHIRT',
          printMethod: 'DTF',
          includedPrintLocations: ['Front', 'Back'],
          maxPrintLocations: 2,
          basePrice: 20.0,
          priceTiers: [
            { minQty: 1, price: 20.0 },
            { minQty: 12, price: 17.0 },
            { minQty: 25, price: 15.0 },
            { minQty: 50, price: 13.0 },
          ],
          availableBrands: ['gildan', 'bella-canvas', 'next-level'],
          availableSizes: ['YXS', 'YS', 'YM', 'YL', 'YXL'],
          estimatedProductionMinutes: 8,
          difficultyLevel: 'easy',
          materials: [
            { materialCategory: 'BLANK_GARMENT', description: 'Blank Youth T-Shirt', quantityPerUnit: 1, estimatedCostPerUnit: 2.5 },
            { materialCategory: 'DTF_TRANSFER', description: 'DTF Transfer - Front & Back', quantityPerUnit: 2, estimatedCostPerUnit: 2.5 },
          ],
        },
      ],
    },
    {
      name: 'Ladies Fit',
      icon: '👚',
      displayOrder: 8,
      products: [
        {
          name: 'DTF Ladies T-Shirt - Front Print',
          garmentType: 'TSHIRT',
          printMethod: 'DTF',
          includedPrintLocations: ['Front'],
          maxPrintLocations: 1,
          basePrice: 18.0,
          sizeUpcharges: { '2XL': 2.0, '3XL': 3.0 },
          priceTiers: [
            { minQty: 1, price: 18.0 },
            { minQty: 12, price: 16.0 },
            { minQty: 25, price: 14.0 },
            { minQty: 50, price: 12.0 },
          ],
          availableBrands: ['gildan', 'bella-canvas', 'next-level'],
          availableSizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
          estimatedProductionMinutes: 5,
          difficultyLevel: 'easy',
          materials: [
            { materialCategory: 'BLANK_GARMENT', description: 'Blank Ladies T-Shirt (ladies-cut style)', quantityPerUnit: 1, estimatedCostPerUnit: 3.5 },
            { materialCategory: 'DTF_TRANSFER', description: 'DTF Transfer - Front', quantityPerUnit: 1, estimatedCostPerUnit: 3.0 },
          ],
        },
      ],
    },
    {
      name: 'Specialty',
      icon: '✨',
      displayOrder: 9,
      products: [
        {
          name: 'Glitter HTV T-Shirt',
          garmentType: 'TSHIRT',
          printMethod: 'HTV',
          includedPrintLocations: ['Front'],
          maxPrintLocations: 1,
          basePrice: 22.0,
          sizeUpcharges: { '2XL': 2.0, '3XL': 3.0 },
          priceTiers: [
            { minQty: 1, price: 22.0 },
            { minQty: 12, price: 20.0 },
            { minQty: 25, price: 18.0 },
          ],
          availableBrands: ['gildan', 'bella-canvas', 'next-level'],
          availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
          estimatedProductionMinutes: 8,
          difficultyLevel: 'medium',
          materials: [
            { materialCategory: 'BLANK_GARMENT', description: 'Blank T-Shirt', quantityPerUnit: 1, estimatedCostPerUnit: 3.5 },
            { materialCategory: 'HTV_VINYL', description: 'Siser Glitter Vinyl', quantityPerUnit: 1, estimatedCostPerUnit: 4.0 },
          ],
        },
        {
          name: 'Metallic HTV T-Shirt',
          garmentType: 'TSHIRT',
          printMethod: 'HTV',
          includedPrintLocations: ['Front'],
          maxPrintLocations: 1,
          basePrice: 24.0,
          sizeUpcharges: { '2XL': 2.0, '3XL': 3.0 },
          priceTiers: [
            { minQty: 1, price: 24.0 },
            { minQty: 12, price: 21.0 },
            { minQty: 25, price: 19.0 },
          ],
          availableBrands: ['gildan', 'bella-canvas', 'next-level'],
          availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
          estimatedProductionMinutes: 8,
          difficultyLevel: 'medium',
          materials: [
            { materialCategory: 'BLANK_GARMENT', description: 'Blank T-Shirt', quantityPerUnit: 1, estimatedCostPerUnit: 3.5 },
            { materialCategory: 'HTV_VINYL', description: 'Siser Electric/Metallic Vinyl', quantityPerUnit: 1, estimatedCostPerUnit: 5.0 },
          ],
        },
        {
          name: 'Glow-in-Dark HTV T-Shirt',
          garmentType: 'TSHIRT',
          printMethod: 'HTV',
          includedPrintLocations: ['Front'],
          maxPrintLocations: 1,
          basePrice: 25.0,
          sizeUpcharges: { '2XL': 2.0, '3XL': 3.0 },
          priceTiers: [
            { minQty: 1, price: 25.0 },
            { minQty: 12, price: 22.0 },
            { minQty: 25, price: 20.0 },
          ],
          availableBrands: ['gildan', 'bella-canvas'],
          availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
          estimatedProductionMinutes: 8,
          difficultyLevel: 'medium',
          materials: [
            { materialCategory: 'BLANK_GARMENT', description: 'Blank T-Shirt', quantityPerUnit: 1, estimatedCostPerUnit: 3.5 },
            { materialCategory: 'HTV_VINYL', description: 'Glow-in-Dark Vinyl', quantityPerUnit: 1, estimatedCostPerUnit: 5.5 },
          ],
        },
        {
          name: 'Reflective HTV T-Shirt',
          garmentType: 'TSHIRT',
          printMethod: 'HTV',
          includedPrintLocations: ['Front'],
          maxPrintLocations: 1,
          basePrice: 28.0,
          sizeUpcharges: { '2XL': 2.0, '3XL': 3.0 },
          priceTiers: [
            { minQty: 1, price: 28.0 },
            { minQty: 12, price: 25.0 },
            { minQty: 25, price: 22.0 },
          ],
          availableBrands: ['gildan', 'bella-canvas'],
          availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
          estimatedProductionMinutes: 8,
          difficultyLevel: 'medium',
          materials: [
            { materialCategory: 'BLANK_GARMENT', description: 'Blank T-Shirt', quantityPerUnit: 1, estimatedCostPerUnit: 3.5 },
            { materialCategory: 'HTV_VINYL', description: 'Reflective Vinyl', quantityPerUnit: 1, estimatedCostPerUnit: 6.0 },
          ],
        },
      ],
    },
  ];

  const defaultAddOns: Array<{
    name: string;
    description: string;
    type: AddOnType;
    price: number;
  }> = [
    { name: 'Additional Print Location', description: 'Add another print location (sleeve, pocket, etc.)', type: 'EXTRA_PRINT_LOCATION', price: 5.0 },
    { name: 'Rush Order (3-Day)', description: 'Guaranteed completion within 3 business days', type: 'RUSH_ORDER', price: 10.0 },
    { name: 'Same Day Rush', description: 'Completed same business day (if ordered before noon)', type: 'RUSH_ORDER', price: 20.0 },
    { name: 'Individual Name/Number', description: 'Custom name or number per garment (sports jerseys, etc.)', type: 'NAME_CUSTOMIZATION', price: 3.0 },
    { name: 'Individual Name + Number', description: 'Custom name AND number per garment', type: 'NAME_CUSTOMIZATION', price: 5.0 },
    { name: 'Oversized Print (14x16 or larger)', description: 'Print larger than standard 12x14', type: 'OVERSIZED_PRINT', price: 3.0 },
    { name: 'Premium Garment Upgrade', description: 'Upgrade from standard to premium brand (Bella+Canvas, Comfort Colors)', type: 'PREMIUM_GARMENT', price: 4.0 },
    { name: 'Glitter/Metallic Vinyl Upgrade', description: 'Use glitter, metallic, or holographic vinyl instead of standard', type: 'SPECIAL_FINISH', price: 5.0 },
    { name: 'Gift Packaging', description: 'Individual tissue paper wrapping with thank-you sticker', type: 'PACKAGING', price: 2.0 },
    { name: 'Design Service - Simple', description: 'Simple text-based or basic logo design', type: 'DESIGN_SERVICE', price: 25.0 },
    { name: 'Design Service - Complex', description: 'Complex multi-color illustration or detailed design', type: 'DESIGN_SERVICE', price: 50.0 },
    { name: 'Design Service - Premium', description: 'Premium custom artwork, multiple revisions included', type: 'DESIGN_SERVICE', price: 100.0 },
  ];

  await prisma.$transaction(async (tx) => {
    for (const cat of categories) {
      const category = await tx.productCategory.create({
        data: { name: cat.name, icon: cat.icon, displayOrder: cat.displayOrder, organizationId },
      });

      for (const p of cat.products) {
        await tx.product.create({
          data: {
            organizationId,
            categoryId: category.id,
            name: p.name,
            description: p.description,
            garmentType: p.garmentType,
            printMethod: p.printMethod,
            includedPrintLocations: p.includedPrintLocations,
            maxPrintLocations: p.maxPrintLocations,
            basePrice: new Prisma.Decimal(p.basePrice),
            sizeUpcharges: p.sizeUpcharges ? toJson(p.sizeUpcharges) : Prisma.JsonNull,
            priceTiers: toJson(p.priceTiers),
            availableBrands: p.availableBrands,
            availableSizes: p.availableSizes,
            availableColors: [],
            estimatedProductionMinutes: p.estimatedProductionMinutes,
            difficultyLevel: p.difficultyLevel,
            materialTemplates: {
              create: p.materials.map((m) => ({
                organizationId,
                materialCategory: m.materialCategory,
                description: m.description,
                quantityPerUnit: new Prisma.Decimal(m.quantityPerUnit),
                estimatedCostPerUnit: new Prisma.Decimal(m.estimatedCostPerUnit),
              })),
            },
          },
        });
      }
    }

    for (const addOn of defaultAddOns) {
      await tx.productAddOn.create({
        data: { ...addOn, organizationId, price: new Prisma.Decimal(addOn.price) },
      });
    }
  });
}
