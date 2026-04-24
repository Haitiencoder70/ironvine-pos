import { Router } from 'express';

import { checkOrderLimit } from '../middleware/usage';
import { validate } from '../middleware/validate';
import { authorize } from '../middleware/authorize';
import {
  getAll,
  create,
  getById,
  update,
  updateStatus,
  useMaterialsHandler,
  getWorkflowStatus,
} from '../controllers/orderController';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  useMaterialsSchema,
  listOrdersQuerySchema,
} from '../validators/order';
import { z } from 'zod';

export const ordersRouter = Router();

// All order routes require auth + tenant
// removed redundant middleware

// ─── List Orders ──────────────────────────────────────────────────────────────
ordersRouter.get('/', authorize('orders:view'), validate(listOrdersQuerySchema, 'query'), getAll);

// ─── Create Order ─────────────────────────────────────────────────────────────
ordersRouter.post('/', authorize('orders:create'), checkOrderLimit, validate(createOrderSchema), create);

// ─── Get Order ────────────────────────────────────────────────────────────────
ordersRouter.get('/:id', authorize('orders:view'), getById);

// ─── Update Order ─────────────────────────────────────────────────────────────
// Basic update schema reusing fields from create without materials/items
const updateOrderSchema = createOrderSchema.omit({ items: true, customerId: true }).partial().extend({
  discount: z.number().nonnegative().optional(),
});
ordersRouter.patch('/:id', authorize('orders:edit'), validate(updateOrderSchema), update);

// ─── Update Status ────────────────────────────────────────────────────────────
ordersRouter.patch('/:id/status', authorize('orders:approve'), validate(updateOrderStatusSchema), updateStatus);

// ─── Use Materials ────────────────────────────────────────────────────────────
ordersRouter.post('/:id/use-materials', authorize('orders:edit'), validate(useMaterialsSchema), useMaterialsHandler);

// ─── Workflow Status ──────────────────────────────────────────────────────────
ordersRouter.get('/:id/workflow', authorize('orders:view'), getWorkflowStatus);
