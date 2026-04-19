import { Router } from 'express';

import { validate } from '../middleware/validate';
import { authorize } from '../middleware/authorize';
import {
  getAll,
  getById,
  create,
  update,
  deleteCustomer,
  getCustomerOrders,
} from '../controllers/customerController';
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersQuerySchema,
} from '../validators/customer';

export const customersRouter = Router();

// All customer routes require auth + tenant (Already applied globally in app.ts)
// // removed redundant middleware

// ─── List Customers ───────────────────────────────────────────────────────────
customersRouter.get('/', authorize('customers:view'), validate(listCustomersQuerySchema, 'query'), getAll);

// ─── Get Customer ─────────────────────────────────────────────────────────────
customersRouter.get('/:id', authorize('customers:view'), getById);

// ─── Create Customer ──────────────────────────────────────────────────────────
customersRouter.post('/', authorize('customers:create'), validate(createCustomerSchema), create);

// ─── Update Customer ──────────────────────────────────────────────────────────
customersRouter.patch('/:id', authorize('customers:edit'), validate(updateCustomerSchema), update);

// ─── Delete Customer ──────────────────────────────────────────────────────────
customersRouter.delete('/:id', authorize('customers:delete'), deleteCustomer);

// ─── Get Customer Orders ──────────────────────────────────────────────────────
customersRouter.get('/:id/orders', authorize('customers:view'), getCustomerOrders);
