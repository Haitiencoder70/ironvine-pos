import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { injectTenant } from '../middleware/tenant';
import { validate } from '../middleware/validate';
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
} from '../validators/shipment';
import { ShipmentCarrier } from '@prisma/client';
import { z } from 'zod';

export const shipmentsRouter = Router();

// All shipment routes require auth + tenant
shipmentsRouter.use(requireAuth, injectTenant);

// ─── List Shipments ───────────────────────────────────────────────────────────
shipmentsRouter.get('/', validate(listShipmentsQuerySchema, 'query'), getAll);

// ─── Get Shipment ─────────────────────────────────────────────────────────────
shipmentsRouter.get('/:id', getById);

// ─── Create Shipment ──────────────────────────────────────────────────────────
shipmentsRouter.post('/', validate(createShipmentSchema), create);

// ─── Update Shipment Status ───────────────────────────────────────────────────
shipmentsRouter.patch('/:id/status', validate(updateShipmentStatusSchema), updateStatus);

// ─── Update Tracking ──────────────────────────────────────────────────────────
const updateTrackingSchema = z.object({
  carrier: z.nativeEnum(ShipmentCarrier).optional(),
  trackingNumber: z.string().optional(),
  estimatedDelivery: z.coerce.date().optional(),
});
shipmentsRouter.patch('/:id/tracking', validate(updateTrackingSchema), updateTrackingHandler);
