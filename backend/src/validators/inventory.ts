import { z } from 'zod';
import { InventoryCategory, StockMovementType } from '@prisma/client';

export const createInventoryItemSchema = z.object({
  sku: z.string().min(1).max(100).optional(), // optional — auto-generated if omitted
  name: z.string().min(1).max(200),
  category: z.nativeEnum(InventoryCategory),
  brand: z.string().max(100).optional(),
  size: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  quantityOnHand: z.number().int().nonnegative().optional(),
  reorderPoint: z.number().int().nonnegative().optional(),
  reorderQuantity: z.number().int().positive().optional(),
  costPrice: z.number().nonnegative(),
  notes: z.string().max(1000).optional(),
});

export const adjustStockSchema = z.object({
  quantityDelta: z.number().int().refine((n) => n !== 0, { message: 'quantityDelta cannot be zero' }),
  type: z.nativeEnum(StockMovementType),
  reason: z.string().max(500).optional(),
  orderId: z.string().cuid().optional(),
});

export const listInventoryQuerySchema = z.object({
  category: z.nativeEnum(InventoryCategory).optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});
