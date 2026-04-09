import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { injectTenant } from '../middleware/tenant';
import { validate } from '../middleware/validate';
import {
  getAll,
  getById,
  create,
  update,
} from '../controllers/vendorController';
import { createVendorSchema, updateVendorSchema, listVendorsQuerySchema } from '../validators/vendor';

export const vendorsRouter = Router();

// All vendor routes require auth + tenant
vendorsRouter.use(requireAuth, injectTenant);

// ─── List Vendors ─────────────────────────────────────────────────────────────
vendorsRouter.get('/', validate(listVendorsQuerySchema, 'query'), getAll);

// ─── Get Vendor ───────────────────────────────────────────────────────────────
vendorsRouter.get('/:id', getById);

// ─── Create Vendor ────────────────────────────────────────────────────────────
vendorsRouter.post('/', validate(createVendorSchema), create);

// ─── Update Vendor ────────────────────────────────────────────────────────────
vendorsRouter.patch('/:id', validate(updateVendorSchema), update);
