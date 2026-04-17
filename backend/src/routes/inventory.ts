import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { injectTenant } from '../middleware/tenant';
import { checkLimit } from '../middleware/limits';
import { validate } from '../middleware/validate';
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
inventoryRouter.use(requireAuth, injectTenant);

// ─── List Inventory ───────────────────────────────────────────────────────────
inventoryRouter.get('/', validate(listInventoryQuerySchema, 'query'), getAll);

// ─── Create Inventory Item ────────────────────────────────────────────────────
inventoryRouter.post('/', checkLimit('inventoryItems'), validate(createInventoryItemSchema), create);

// ─── Low Stock Alert Items ────────────────────────────────────────────────────
// IMPORTANT: Must be registered BEFORE /:id to avoid Express treating "low-stock" as an ID
inventoryRouter.get('/low-stock', getLowStock);

// ─── Get Individual Item ──────────────────────────────────────────────────────
inventoryRouter.get('/:id', getById);

// ─── Update Item ──────────────────────────────────────────────────────────────
const updateInventoryItemSchema = createInventoryItemSchema.partial().extend({ isActive: z.boolean().optional() });
inventoryRouter.patch('/:id', validate(updateInventoryItemSchema), update);

// ─── Adjust Stock ─────────────────────────────────────────────────────────────
inventoryRouter.patch('/:id/adjust', validate(adjustStockSchema), adjustStockHandler);

// ─── Stock Movements ──────────────────────────────────────────────────────────
inventoryRouter.get('/:id/movements', getMovements);

// ─── Delete (Soft) ────────────────────────────────────────────────────────────
inventoryRouter.delete('/:id', deleteItem);
