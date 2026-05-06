import { z } from 'zod';
import { GarmentType, PrintMethod, AddOnType } from '@prisma/client';

export const createProductCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(10).optional(),
  displayOrder: z.number().int().nonnegative().optional(),
});

export const updateProductCategorySchema = createProductCategorySchema.partial();

export const materialTemplateSchema = z.object({
  materialCategory: z.string().min(1).max(50),
  description: z.string().min(1).max(500),
  quantityPerUnit: z.number().positive(),
  estimatedCostPerUnit: z.number().nonnegative(),
  notes: z.string().max(500).optional(),
  inventoryItemId: z.string().cuid().optional().nullable(),
});

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  sku: z.string().max(100).optional(),
  garmentType: z.nativeEnum(GarmentType),
  printMethod: z.nativeEnum(PrintMethod),
  basePrice: z.number().positive(),
  categoryId: z.string().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  includedPrintLocations: z.array(z.string()).optional(),
  maxPrintLocations: z.number().int().positive().optional(),
  availableBrands: z.array(z.string()).optional(),
  availableSizes: z.array(z.string()).optional(),
  availableColors: z.array(z.string()).optional(),
  priceTiers: z.array(z.object({
    minQty: z.number().int().positive(),
    price: z.number().positive(),
  })).optional(),
  sizeUpcharges: z.record(z.number().nonnegative()).optional(),
  estimatedProductionMinutes: z.number().int().nonnegative().optional(),
  difficultyLevel: z.string().optional(),
  materialTemplates: z.array(materialTemplateSchema).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const calculatePriceSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().positive(),
  size: z.string().optional(),
  selectedAddOnIds: z.array(z.string().cuid()).optional(),
});

export const createAddOnSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price: z.number().nonnegative(),
  type: z.nativeEnum(AddOnType),
  isActive: z.boolean().optional(),
  productId: z.string().cuid().optional(),
});

export const updateAddOnSchema = createAddOnSchema.partial();
