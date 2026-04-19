import { Router } from 'express';

import { validate } from '../middleware/validate';
import { authorize } from '../middleware/authorize';
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
// removed redundant middleware

// ─── List Purchase Orders ─────────────────────────────────────────────────────
purchaseOrdersRouter.get('/', authorize('pos:view'), validate(listPOQuerySchema, 'query'), getAll);

// ─── Get POs By Order ─────────────────────────────────────────────────────────
purchaseOrdersRouter.get('/by-order/:orderId', authorize('pos:view'), getByOrder);

// ─── Get PO By ID ─────────────────────────────────────────────────────────────
purchaseOrdersRouter.get('/:id', authorize('pos:view'), getById);

// ─── Create Purchase Order ────────────────────────────────────────────────────
purchaseOrdersRouter.post('/', authorize('pos:create'), validate(createPOSchema), create);

// ─── Receive Purchase Order Items ─────────────────────────────────────────────
purchaseOrdersRouter.patch('/:id/receive', authorize('pos:create'), validate(receivePOSchema), receiveItems);

// ─── Send to Vendor ───────────────────────────────────────────────────────────
purchaseOrdersRouter.post('/:id/send', authorize('pos:approve'), sendToVendorHandler);

// ─── Update Status ────────────────────────────────────────────────────────────
const updatePOStatusSchema = z.object({ newStatus: z.nativeEnum(PurchaseOrderStatus), notes: z.string().optional() });
purchaseOrdersRouter.patch('/:id/status', authorize('pos:approve'), validate(updatePOStatusSchema), updateStatus);
