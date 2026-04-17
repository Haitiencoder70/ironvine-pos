import { z } from 'zod';
import { PurchaseOrderStatus } from '@prisma/client';

export const createPOItemSchema = z.object({
  inventoryItemId: z.string().min(1).optional(),
  description: z.string().min(1).max(500),
  quantity: z.number().int().positive(),
  unitCost: z.number().nonnegative(),
});

export const createPOSchema = z.object({
  vendorId: z.string().min(1),
  linkedOrderId: z.string().min(1).optional(),
  notes: z.string().max(2000).optional(),
  expectedDate: z.coerce.date().optional(),
  items: z.array(createPOItemSchema).min(1, 'Purchase order must have at least one item'),
});

export const receivePOItemSchema = z.object({
  purchaseOrderItemId: z.string().min(1),
  inventoryItemId: z.string().min(1).optional(),
  quantityReceived: z.number().int().positive(),
  notes: z.string().max(500).optional(),
  isAccepted: z.boolean().optional(),
});

export const receivePOSchema = z.object({
  receivedBy: z.string().min(1).max(200).optional(), // falls back to Clerk userId in route
  notes: z.string().max(2000).optional(),
  items: z.array(receivePOItemSchema).min(1, 'Must provide at least one item to receive'),
});

export const listPOQuerySchema = z.object({
  status: z.nativeEnum(PurchaseOrderStatus).optional(),
  vendorId: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
