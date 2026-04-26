import { z } from 'zod';
import { OrderStatus, OrderPriority, PrintMethod, PrintLocation } from '@prisma/client';

export const requiredMaterialSchema = z.object({
  inventoryItemId: z.string().min(1).optional(),
  description: z.string().min(1).max(500),
  quantityRequired: z.number().positive(),
  quantityUnit: z.string().max(50).optional(),
  materialCategory: z.string().max(50).optional(),
});

export const createOrderItemSchema = z.object({
  productType: z.string().min(1).max(100),
  size: z.string().max(20).optional(),
  color: z.string().max(50).optional(),
  sleeveType: z.string().max(50).optional(),
  quantity: z.number().int().positive().max(10_000),
  unitPrice: z.number().nonnegative(),
  printMethod: z.nativeEnum(PrintMethod).optional(),
  printLocations: z.array(z.nativeEnum(PrintLocation)).optional(),
  description: z.string().max(500).optional(),
  requiredMaterials: z.array(requiredMaterialSchema).optional(),
});

export const createOrderSchema = z.object({
  customerId: z.string().min(1),
  priority: z.nativeEnum(OrderPriority).optional(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
  internalNotes: z.string().max(2000).optional(),
  designNotes: z.string().max(2000).optional(),
  designFiles: z.array(z.string().url()).optional(),
  items: z.array(createOrderItemSchema).min(1, 'Order must have at least one item'),
});

export const updateOrderStatusSchema = z.object({
  newStatus: z.nativeEnum(OrderStatus),
  notes: z.string().max(2000).optional(),
});

export const useMaterialsSchema = z.object({
  materials: z
    .array(
      z.object({
        inventoryItemId: z.string().min(1),
        quantityUsed: z.number().positive(),
        quantityUnit: z.string().max(50).optional(),
        notes: z.string().max(500).optional(),
      }),
    )
    .min(1, 'Must provide at least one material'),
});

export const listOrdersQuerySchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  customerId: z.string().min(1).optional(),
  priority: z.nativeEnum(OrderPriority).optional(),
  search: z.string().max(100).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sortKey: z.enum(['createdAt', 'orderNumber', 'total', 'dueDate', 'customerName']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});

export const updateOrderSchema = createOrderSchema.partial();
