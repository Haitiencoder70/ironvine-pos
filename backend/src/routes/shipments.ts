import { Router } from 'express';

import { validate } from '../middleware/validate';
import { authorize } from '../middleware/authorize';
import {
  getAll,
  create,
  getById,
  updateStatus,
  updateTrackingHandler,
} from '../controllers/shipmentController';
import {
  createShipmentSchema,
  updateShipmentStatusSchema,
  listShipmentsQuerySchema,
  updateShipmentTrackingSchema,
} from '../validators/shipment';

export const shipmentsRouter = Router();

// All shipment routes require auth + tenant
// removed redundant middleware

// ─── List Shipments ───────────────────────────────────────────────────────────
shipmentsRouter.get('/', authorize('orders:view'), validate(listShipmentsQuerySchema, 'query'), getAll);

// ─── Get Shipment ─────────────────────────────────────────────────────────────
shipmentsRouter.get('/:id', authorize('orders:view'), getById);

// ─── Create Shipment ──────────────────────────────────────────────────────────
shipmentsRouter.post('/', authorize('orders:edit'), validate(createShipmentSchema), create);

// ─── Update Shipment Status ───────────────────────────────────────────────────
shipmentsRouter.patch('/:id/status', authorize('orders:edit'), validate(updateShipmentStatusSchema), updateStatus);

// ─── Update Tracking ──────────────────────────────────────────────────────────
shipmentsRouter.patch('/:id/tracking', authorize('orders:edit'), validate(updateShipmentTrackingSchema), updateTrackingHandler);
