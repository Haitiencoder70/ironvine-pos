import { Router } from 'express';

import { checkLimit } from '../middleware/limits';
import { validate } from '../middleware/validate';
import { authorize } from '../middleware/authorize';
import {
  getAll,
  create,
  getById,
  update,
  adjustStockHandler,
  getMovements,
  getLowStock,
  deleteItem,
} from '../controllers/inventoryController';
import {
  createInventoryItemSchema,
  adjustStockSchema,
  listInventoryQuerySchema,
} from '../validators/inventory';
import { z } from 'zod';

export const inventoryRouter = Router();

// All inventory routes require auth + tenant
// removed redundant middleware

// ─── List Inventory ───────────────────────────────────────────────────────────
inventoryRouter.get('/', authorize('inventory:view'), validate(listInventoryQuerySchema, 'query'), getAll);

// ─── Create Inventory Item ────────────────────────────────────────────────────
inventoryRouter.post('/', authorize('inventory:create'), checkLimit('inventoryItems'), validate(createInventoryItemSchema), create);

// ─── Low Stock Alert Items ────────────────────────────────────────────────────
// IMPORTANT: Must be registered BEFORE /:id to avoid Express treating "low-stock" as an ID
inventoryRouter.get('/low-stock', authorize('inventory:view'), getLowStock);

// ─── Get Individual Item ──────────────────────────────────────────────────────
inventoryRouter.get('/:id', authorize('inventory:view'), getById);

// ─── Update Item ──────────────────────────────────────────────────────────────
const updateInventoryItemSchema = createInventoryItemSchema.partial().extend({ isActive: z.boolean().optional() });
inventoryRouter.patch('/:id', authorize('inventory:edit'), validate(updateInventoryItemSchema), update);

// ─── Adjust Stock ─────────────────────────────────────────────────────────────
inventoryRouter.patch('/:id/adjust', authorize('inventory:adjust'), validate(adjustStockSchema), adjustStockHandler);

// ─── Stock Movements ──────────────────────────────────────────────────────────
inventoryRouter.get('/:id/movements', authorize('inventory:view'), getMovements);

// ─── Delete (Soft) ────────────────────────────────────────────────────────────
inventoryRouter.delete('/:id', authorize('inventory:delete'), deleteItem);
