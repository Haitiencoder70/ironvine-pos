import { z } from 'zod';
import { ShipmentCarrier, ShipmentStatus } from '@prisma/client';

// Basic tracking formats: 1Z..., 9..., FX..., etc.
const trackingNumberRegex = /^[A-Z0-9]{5,40}$/i;

export const createShipmentSchema = z.object({
  orderId: z.string().min(1),
  carrier: z.nativeEnum(ShipmentCarrier),
  trackingNumber: z
    .string()
    .regex(trackingNumberRegex, 'Enter a valid tracking number')
    .optional()
    .or(z.literal('')),
  shippingStreet: z.string().max(200).optional(),
  shippingCity: z.string().max(100).optional(),
  shippingState: z.string().max(100).optional(),
  shippingZip: z.string().max(20).optional(),
  shippingCountry: z.string().max(2).optional(),
  shippingCost: z
    .number({ invalid_type_error: 'Must be a number' })
    .nonnegative('Must be 0 or more')
    .max(10_000, 'Shipping cost seems too high')
    .optional(),
  estimatedDelivery: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
});

export const updateShipmentStatusSchema = z.object({
  newStatus: z.nativeEnum(ShipmentStatus),
  trackingNumber: z
    .string()
    .regex(trackingNumberRegex, 'Enter a valid tracking number')
    .optional()
    .or(z.literal('')),
  estimatedDelivery: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
  location: z.string().max(200).optional(),
});

export const updateShipmentTrackingSchema = z.object({
  trackingNumber: z
    .string()
    .regex(trackingNumberRegex, 'Enter a valid tracking number'),
  carrier: z.nativeEnum(ShipmentCarrier).optional(),
  estimatedDelivery: z.coerce.date().optional(),
});

export const listShipmentsQuerySchema = z.object({
  status: z.nativeEnum(ShipmentStatus).optional(),
  orderId: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
