import { Prisma, Shipment, ShipmentStatus, ShipmentCarrier } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { AppError } from '../middleware/errorHandler';
import { sendShipmentTrackingEmail, sendShipmentTrackingSMS } from './notificationService';
import type { PaginatedResult, PaginationInput } from '../types/services';

// ─── Valid Status Transitions ─────────────────────────────────────────────────

const VALID_SHIPMENT_TRANSITIONS: Partial<Record<ShipmentStatus, ShipmentStatus[]>> = {
  PENDING: ['LABEL_CREATED'],
  LABEL_CREATED: ['IN_TRANSIT', 'EXCEPTION'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'EXCEPTION'],
  DELIVERED: [],
  EXCEPTION: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'],
};

function buildTrackingUrl(carrier: ShipmentCarrier, trackingNumber: string): string {
  const encoded = encodeURIComponent(trackingNumber);
  if (carrier === 'UPS') return `https://www.ups.com/track?tracknum=${encoded}`;
  if (carrier === 'FEDEX') return `https://www.fedex.com/fedextrack/?trknbr=${encoded}`;
  if (carrier === 'USPS') return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encoded}`;
  if (carrier === 'DHL') return `https://www.dhl.com/en/express/tracking.html?AWB=${encoded}`;
  return `https://www.google.com/search?q=${encoded}`;
}

function customerDisplayName(customer: { firstName: string; lastName: string } | null): string | undefined {
  if (!customer) return undefined;
  return [customer.firstName, customer.lastName].filter(Boolean).join(' ') || undefined;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateShipmentInput {
  organizationId: string;
  orderId: string;
  carrier: ShipmentCarrier;
  trackingNumber?: string;
  shippingStreet?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZip?: string;
  shippingCountry?: string;
  shippingCost?: number;
  estimatedDelivery?: Date;
  notes?: string;
  sendTrackingEmail?: boolean;
  performedBy: string;
}

export async function createShipment(input: CreateShipmentInput): Promise<Shipment> {
  const {
    organizationId,
    orderId,
    carrier,
    trackingNumber,
    shippingStreet,
    shippingCity,
    shippingState,
    shippingZip,
    shippingCountry,
    shippingCost,
    estimatedDelivery,
    notes,
    sendTrackingEmail,
    performedBy,
  } = input;

  // Verify order belongs to org and is in a shippable state
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      organizationId: true,
      status: true,
      orderNumber: true,
      customer: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  if (!order || order.organizationId !== organizationId) {
    throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
  }

  if (order.status !== 'READY_TO_SHIP') {
    throw new AppError(
      400,
      `Cannot create shipment for order in status "${order.status}". Order must be READY_TO_SHIP.`,
      'INVALID_ORDER_STATUS',
    );
  }

  if (sendTrackingEmail) {
    if (!trackingNumber) {
      throw new AppError(400, 'Add a tracking number before emailing the customer.', 'TRACKING_NUMBER_REQUIRED');
    }
    if (!order.customer?.email) {
      throw new AppError(400, 'Customer does not have an email address on file.', 'CUSTOMER_EMAIL_REQUIRED');
    }
  }

  const shipment = await prisma.$transaction(async (tx) => {
    const created = await tx.shipment.create({
      data: {
        organizationId,
        orderId,
        carrier,
        trackingNumber,
        status: 'PENDING',
        shippingStreet,
        shippingCity,
        shippingState,
        shippingZip,
        shippingCountry: shippingCountry ?? 'US',
        shippingCost,
        estimatedDelivery,
        notes,
      },
    });

    await tx.shipmentStatusHistory.create({
      data: {
        shipmentId: created.id,
        fromStatus: null,
        toStatus: 'PENDING',
        changedBy: performedBy,
        notes: 'Shipment created',
        organizationId,
      },
    });

    await tx.activityLog.create({
      data: {
        action: 'CREATED',
        entityType: 'Shipment',
        entityId: created.id,
        entityLabel: trackingNumber ?? created.id,
        description: `Shipment created for order ${order.orderNumber}`,
        performedBy,
        organizationId,
      },
    });

    return created;
  });

  logger.info('Shipment created', { shipmentId: shipment.id, orderId, organizationId });

  if (sendTrackingEmail) {
    const emailTrackingNumber = trackingNumber ?? '';
    await sendShipmentTrackingEmail({
      organizationId,
      customerEmail: order.customer?.email ?? '',
      customerName: customerDisplayName(order.customer),
      orderNumber: order.orderNumber,
      carrier,
      trackingNumber: emailTrackingNumber,
      trackingUrl: buildTrackingUrl(carrier, emailTrackingNumber),
      estimatedDelivery,
    });
  }

  return shipment;
}

// ─── Status Update ────────────────────────────────────────────────────────────

export interface UpdateShipmentStatusInput {
  organizationId: string;
  shipmentId: string;
  newStatus: ShipmentStatus;
  trackingNumber?: string;
  estimatedDelivery?: Date;
  notes?: string;
  location?: string;
  performedBy: string;
}

export async function updateShipmentStatus(input: UpdateShipmentStatusInput): Promise<Shipment> {
  const { organizationId, shipmentId, newStatus, trackingNumber, estimatedDelivery, notes, location, performedBy } =
    input;

  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    select: { id: true, organizationId: true, status: true, orderId: true, trackingNumber: true, order: { select: { customer: { select: { phone: true } }, orderNumber: true } } },
  });

  if (!shipment || shipment.organizationId !== organizationId) {
    throw new AppError(404, 'Shipment not found', 'SHIPMENT_NOT_FOUND');
  }

  const allowedNext = VALID_SHIPMENT_TRANSITIONS[shipment.status] ?? [];
  if (!allowedNext.includes(newStatus)) {
    throw new AppError(
      400,
      `Cannot transition shipment from ${shipment.status} to ${newStatus}`,
      'INVALID_STATUS_TRANSITION',
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.shipment.update({
      where: { id: shipmentId },
      data: {
        status: newStatus,
        ...(trackingNumber ? { trackingNumber } : {}),
        ...(estimatedDelivery ? { estimatedDelivery } : {}),
        ...(newStatus === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
      },
    });

    await tx.shipmentStatusHistory.create({
      data: {
        shipmentId,
        fromStatus: shipment.status,
        toStatus: newStatus,
        changedBy: performedBy,
        notes,
        location,
        organizationId,
      },
    });

    await tx.activityLog.create({
      data: {
        action: 'STATUS_CHANGED',
        entityType: 'Shipment',
        entityId: shipmentId,
        entityLabel: shipment.trackingNumber ?? shipmentId,
        description: `Shipment status changed from ${shipment.status} to ${newStatus}`,
        metadata: { from: shipment.status, to: newStatus },
        performedBy,
        organizationId,
      },
    });

    // When shipment is delivered, advance order to DELIVERED
    if (newStatus === 'DELIVERED') {
      const order = await tx.order.findUnique({
        where: { id: shipment.orderId },
        select: { status: true, orderNumber: true },
      });

      if (order?.status === 'SHIPPED') {
        await tx.order.update({
          where: { id: shipment.orderId },
          data: { status: 'DELIVERED' },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: shipment.orderId,
            fromStatus: 'SHIPPED',
            toStatus: 'DELIVERED',
            changedBy: performedBy,
            notes: `Shipment delivered`,
            organizationId,
          },
        });
      }
    }

    // When shipment moves to IN_TRANSIT, advance order to SHIPPED if still READY_TO_SHIP
    if (newStatus === 'IN_TRANSIT' || newStatus === 'LABEL_CREATED') {
      const order = await tx.order.findUnique({
        where: { id: shipment.orderId },
        select: { status: true },
      });

      if (order?.status === 'READY_TO_SHIP') {
        await tx.order.update({
          where: { id: shipment.orderId },
          data: { status: 'SHIPPED' },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: shipment.orderId,
            fromStatus: 'READY_TO_SHIP',
            toStatus: 'SHIPPED',
            changedBy: performedBy,
            notes: 'Shipment label created / in transit',
            organizationId,
          },
        });
      }
    }

    return result;
  });

  // Send Notifications outside transaction
  if ((newStatus === 'IN_TRANSIT' || newStatus === 'LABEL_CREATED') && shipment.trackingNumber && shipment.order?.customer?.phone) {
    const url = `https://www.google.com/search?q=${shipment.trackingNumber}`; // Mock tracking URL provider
    void sendShipmentTrackingSMS(organizationId, shipment.order.customer.phone, shipment.order.orderNumber, url);
  }

  logger.info('Shipment status updated', { shipmentId, from: shipment.status, to: newStatus });
  return updated;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getShipments(
  organizationId: string,
  options: PaginationInput & { status?: ShipmentStatus; orderId?: string } = {},
): Promise<PaginatedResult<Shipment & { order: { id: string; orderNumber: string } }>> {
  const { page = 1, status, orderId } = options;
  const limit = Math.min(options.limit ?? 25, 100);
  const skip = (page - 1) * limit;

  const where: Prisma.ShipmentWhereInput = {
    organizationId,
    ...(status ? { status } : {}),
    ...(orderId ? { orderId } : {}),
  };

  const [data, total] = await prisma.$transaction([
    prisma.shipment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        order: { select: { id: true, orderNumber: true } },
      },
    }),
    prisma.shipment.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getShipmentById(organizationId: string, shipmentId: string) {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
      statusHistory: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!shipment || shipment.organizationId !== organizationId) {
    throw new AppError(404, 'Shipment not found', 'SHIPMENT_NOT_FOUND');
  }

  return shipment;
}

export async function getShipmentsByOrder(organizationId: string, orderId: string): Promise<Shipment[]> {
  return prisma.shipment.findMany({
    where: { organizationId, orderId },
    include: { statusHistory: { orderBy: { createdAt: 'desc' } } },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Update Tracking ──────────────────────────────────────────────────────────

export async function updateTracking(input: {
  organizationId: string;
  shipmentId: string;
  carrier?: ShipmentCarrier;
  trackingNumber?: string;
  estimatedDelivery?: Date;
  performedBy: string;
  sendTrackingEmail?: boolean;
}): Promise<Shipment> {
  const { organizationId, shipmentId, carrier, trackingNumber, estimatedDelivery, performedBy, sendTrackingEmail } = input;

  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    select: {
      id: true,
      organizationId: true,
      trackingNumber: true,
      carrier: true,
      estimatedDelivery: true,
      order: {
        select: {
          orderNumber: true,
          customer: { select: { firstName: true, lastName: true, email: true } },
        },
      },
    },
  });

  if (!shipment || shipment.organizationId !== organizationId) {
    throw new AppError(404, 'Shipment not found', 'SHIPMENT_NOT_FOUND');
  }

  const updated = await prisma.shipment.update({
    where: { id: shipmentId },
    data: {
      ...(carrier ? { carrier } : {}),
      ...(trackingNumber ? { trackingNumber } : {}),
      ...(estimatedDelivery ? { estimatedDelivery } : {}),
    },
  });

  await prisma.activityLog.create({
    data: {
      action: 'UPDATED',
      entityType: 'Shipment',
      entityId: shipmentId,
      entityLabel: trackingNumber ?? shipment.trackingNumber ?? shipmentId,
      description: `Shipment tracking updated${trackingNumber ? ` to ${trackingNumber}` : ''}`,
      performedBy,
      organizationId,
    },
  });

  if (sendTrackingEmail) {
    const emailTrackingNumber = trackingNumber ?? shipment.trackingNumber;
    const emailCarrier = carrier ?? shipment.carrier;
    const emailEstimatedDelivery = estimatedDelivery ?? shipment.estimatedDelivery;

    if (!emailTrackingNumber) {
      throw new AppError(400, 'Add a tracking number before emailing the customer.', 'TRACKING_NUMBER_REQUIRED');
    }
    if (!shipment.order.customer?.email) {
      throw new AppError(400, 'Customer does not have an email address on file.', 'CUSTOMER_EMAIL_REQUIRED');
    }

    await sendShipmentTrackingEmail({
      organizationId,
      customerEmail: shipment.order.customer.email,
      customerName: customerDisplayName(shipment.order.customer),
      orderNumber: shipment.order.orderNumber,
      carrier: emailCarrier,
      trackingNumber: emailTrackingNumber,
      trackingUrl: buildTrackingUrl(emailCarrier, emailTrackingNumber),
      estimatedDelivery: emailEstimatedDelivery,
    });
  }

  logger.info('Shipment tracking updated', { shipmentId, organizationId });
  return updated;
}
