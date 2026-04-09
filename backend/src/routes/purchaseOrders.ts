import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { injectTenant } from '../middleware/tenant';
import { validate } from '../middleware/validate';
import {
  getAll,
  create,
  getById,
  getByOrder,
  receiveItems,
  sendToVendorHandler,
  updateStatus,
} from '../controllers/purchaseOrderController';
import { createPOSchema, receivePOSchema, listPOQuerySchema } from '../validators/po';
import { z } from 'zod';
import { PurchaseOrderStatus } from '@prisma/client';

export const purchaseOrdersRouter = Router();

// All PO routes require auth + tenant
purchaseOrdersRouter.use(requireAuth, injectTenant);

// ─── List Purchase Orders ─────────────────────────────────────────────────────
purchaseOrdersRouter.get('/', validate(listPOQuerySchema, 'query'), getAll);

// ─── Get POs By Order ─────────────────────────────────────────────────────────
purchaseOrdersRouter.get('/by-order/:orderId', getByOrder);

// ─── Get PO By ID ─────────────────────────────────────────────────────────────
purchaseOrdersRouter.get('/:id', getById);

// ─── Create Purchase Order ────────────────────────────────────────────────────
purchaseOrdersRouter.post('/', validate(createPOSchema), create);

// ─── Receive Purchase Order Items ─────────────────────────────────────────────
purchaseOrdersRouter.patch('/:id/receive', validate(receivePOSchema), receiveItems);

// ─── Send to Vendor ───────────────────────────────────────────────────────────
purchaseOrdersRouter.post('/:id/send', sendToVendorHandler);

// ─── Update Status ────────────────────────────────────────────────────────────
const updatePOStatusSchema = z.object({ newStatus: z.nativeEnum(PurchaseOrderStatus), notes: z.string().optional() });
purchaseOrdersRouter.patch('/:id/status', validate(updatePOStatusSchema), updateStatus);
