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
ordersRouter.use(requireAuth, injectTenant);

// ─── List Orders ──────────────────────────────────────────────────────────────
ordersRouter.get('/', validate(listOrdersQuerySchema, 'query'), getAll);

// ─── Create Order ─────────────────────────────────────────────────────────────
ordersRouter.post('/', checkLimit('orders'), validate(createOrderSchema), create);

// ─── Get Order ────────────────────────────────────────────────────────────────
ordersRouter.get('/:id', getById);

// ─── Update Order ─────────────────────────────────────────────────────────────
// Basic update schema reusing fields from create without materials/items
const updateOrderSchema = createOrderSchema.omit({ items: true, customerId: true }).partial().extend({
  discount: z.number().nonnegative().optional(),
});
ordersRouter.patch('/:id', validate(updateOrderSchema), update);

// ─── Update Status ────────────────────────────────────────────────────────────
ordersRouter.patch('/:id/status', validate(updateOrderStatusSchema), updateStatus);

// ─── Use Materials ────────────────────────────────────────────────────────────
ordersRouter.post('/:id/use-materials', validate(useMaterialsSchema), useMaterialsHandler);

// ─── Workflow Status ──────────────────────────────────────────────────────────
ordersRouter.get('/:id/workflow', getWorkflowStatus);
