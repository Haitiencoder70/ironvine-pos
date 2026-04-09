import { z } from 'zod';
import { ShipmentCarrier, ShipmentStatus } from '@prisma/client';

export const createShipmentSchema = z.object({
  orderId: z.string().cuid(),
  carrier: z.nativeEnum(ShipmentCarrier),
  trackingNumber: z.string().max(100).optional(),
  shippingStreet: z.string().max(200).optional(),
  shippingCity: z.string().max(100).optional(),
  shippingState: z.string().max(100).optional(),
  shippingZip: z.string().max(20).optional(),
  shippingCountry: z.string().max(2).optional(),
  shippingCost: z.number().nonnegative().optional(),
  estimatedDelivery: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
});

export const updateShipmentStatusSchema = z.object({
  newStatus: z.nativeEnum(ShipmentStatus),
  trackingNumber: z.string().max(100).optional(),
  estimatedDelivery: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
  location: z.string().max(200).optional(),
});

export const listShipmentsQuerySchema = z.object({
  status: z.nativeEnum(ShipmentStatus).optional(),
  orderId: z.string().cuid().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
