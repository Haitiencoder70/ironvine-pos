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

// ─── Get Individual Item ──────────────────────────────────────────────────────
inventoryRouter.get('/:id', getById);

// ─── Update Item ──────────────────────────────────────────────────────────────
const updateInventoryItemSchema = createInventoryItemSchema.partial().extend({ isActive: z.boolean().optional() });
inventoryRouter.patch('/:id', validate(updateInventoryItemSchema), update);

// ─── Adjust Stock ─────────────────────────────────────────────────────────────
inventoryRouter.patch('/:id/adjust', validate(adjustStockSchema), adjustStockHandler);

// ─── Stock Movements ──────────────────────────────────────────────────────────
inventoryRouter.get('/:id/movements', getMovements);
