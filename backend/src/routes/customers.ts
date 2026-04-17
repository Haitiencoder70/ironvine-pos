import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { injectTenant } from '../middleware/tenant';
import { validate } from '../middleware/validate';
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

// All customer routes require auth + tenant
customersRouter.use(requireAuth, injectTenant);

// ─── List Customers ───────────────────────────────────────────────────────────
customersRouter.get('/', validate(listCustomersQuerySchema, 'query'), getAll);

// ─── Get Customer ─────────────────────────────────────────────────────────────
customersRouter.get('/:id', getById);

// ─── Create Customer ──────────────────────────────────────────────────────────
customersRouter.post('/', validate(createCustomerSchema), create);

// ─── Update Customer ──────────────────────────────────────────────────────────
customersRouter.patch('/:id', validate(updateCustomerSchema), update);

// ─── Delete Customer ──────────────────────────────────────────────────────────
customersRouter.delete('/:id', deleteCustomer);

// ─── Get Customer Orders ──────────────────────────────────────────────────────
customersRouter.get('/:id/orders', getCustomerOrders);
