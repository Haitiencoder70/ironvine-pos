import { z } from 'zod';
import { InventoryCategory, StockMovementType } from '@prisma/client';

const MAX_QUANTITY = 1_000_000;
const MAX_UNIT_COST = 100_000;

export const createInventoryItemSchema = z.object({
  sku: z.string().min(1).max(100).optional(), // optional — auto-generated if omitted
  name: z.string().min(1, 'Item name is required').max(200),
  category: z.nativeEnum(InventoryCategory),
  brand: z.string().max(100).optional(),
  size: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  quantityOnHand: z
    .number({ invalid_type_error: 'Must be a number' })
    .int()
    .nonnegative('Must be 0 or more')
    .max(MAX_QUANTITY, `Cannot exceed ${MAX_QUANTITY.toLocaleString()} units`)
    .optional(),
  reorderPoint: z.number().int().nonnegative().optional(),
  reorderQuantity: z.number().int().positive().optional(),
  costPrice: z
    .number({ invalid_type_error: 'Must be a number' })
    .nonnegative('Must be 0 or more')
    .max(MAX_UNIT_COST, `Cost price cannot exceed $${MAX_UNIT_COST.toLocaleString()}`),
  notes: z.string().max(1000).optional(),
});

export const updateInventoryItemSchema = createInventoryItemSchema.partial().omit({ quantityOnHand: true });

export const adjustStockSchema = z.object({
  quantityDelta: z
    .number({ invalid_type_error: 'Must be a number' })
    .int()
    .refine((n) => n !== 0, { message: 'Adjustment quantity cannot be zero' }),
  type: z.nativeEnum(StockMovementType),
  reason: z.string().max(500).optional(),
  orderId: z.string().min(1).optional(),
});

export const listInventoryQuerySchema = z.object({
  category: z.nativeEnum(InventoryCategory).optional(),
  search: z.string().max(100).optional(),
  lowStockOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});
