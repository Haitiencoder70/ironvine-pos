import { Router } from 'express';

import { validate } from '../middleware/validate';
import { authorize } from '../middleware/authorize';
import {
  getAll,
  getById,
  create,
  update,
} from '../controllers/vendorController';
import { createVendorSchema, updateVendorSchema, listVendorsQuerySchema } from '../validators/vendor';

export const vendorsRouter = Router();

// All vendor routes require auth + tenant
// removed redundant middleware

// ─── List Vendors ─────────────────────────────────────────────────────────────
vendorsRouter.get('/', authorize('inventory:view'), validate(listVendorsQuerySchema, 'query'), getAll);

// ─── Get Vendor ───────────────────────────────────────────────────────────────
vendorsRouter.get('/:id', authorize('inventory:view'), getById);

// ─── Create Vendor ────────────────────────────────────────────────────────────
vendorsRouter.post('/', authorize('inventory:create'), validate(createVendorSchema), create);

// ─── Update Vendor ────────────────────────────────────────────────────────────
vendorsRouter.patch('/:id', authorize('inventory:edit'), validate(updateVendorSchema), update);
