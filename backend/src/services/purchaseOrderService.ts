import { Prisma, PurchaseOrder } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { AppError } from '../middleware/errorHandler';
import { generatePONumber } from '../utils/generators';
import { receiveStock } from './inventoryService';
import type { CreatePOInput, ReceivePOInput } from '../types/services';

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createPOForOrder(input: CreatePOInput): Promise<PurchaseOrder & {
  items: { id: string; description: string; quantity: number; unitCost: Decimal; lineTotal: Decimal }[];
  vendor: { id: string; name: string };
}> {
  const { organizationId, vendorId, linkedOrderId, notes, expectedDate, items, performedBy } = input;

  if (items.length === 0) {
    throw new AppError(400, 'Purchase order must have at least one item', 'EMPTY_PO');
  }

  // Verify vendor belongs to org
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { id: true, organizationId: true, name: true },
  });

  if (!vendor || vendor.organizationId !== organizationId) {
    throw new AppError(404, 'Vendor not found', 'VENDOR_NOT_FOUND');
  }

  // Verify linked order belongs to org (if provided)
  if (linkedOrderId) {
    const linkedOrder = await prisma.order.findUnique({
      where: { id: linkedOrderId },
      select: { id: true, organizationId: true },
    });

    if (!linkedOrder || linkedOrder.organizationId !== organizationId) {
      throw new AppError(404, 'Linked order not found', 'ORDER_NOT_FOUND');
    }
  }

  // Note: sequence number is reserved before the transaction. Gaps can occur on rollback — this is acceptable.
  const poNumber = await generatePONumber(organizationId);

  const subtotal = items
    .reduce((sum, item) => sum.plus(new Decimal(item.unitCost).times(item.quantity)), new Decimal(0))
    .toNumber();
  const total = subtotal;

  const po = await prisma.$transaction(async (tx) => {
    const created = await tx.purchaseOrder.create({
      data: {
        poNumber,
        organizationId,
        vendorId,
        linkedOrderId,
        status: 'DRAFT',
        notes,
        expectedDate,
        subtotal,
        total,
        items: {
          create: items.map((item) => ({
            inventoryItemId: item.inventoryItemId,
            description: item.description,
            quantity: item.quantity,
            quantityRecv: 0,
            unitCost: item.unitCost,
            lineTotal: new Decimal(item.unitCost).times(item.quantity).toNumber(),
            organizationId,
          })),
        },
      },
      include: {
        items: {
          select: { id: true, description: true, quantity: true, unitCost: true, lineTotal: true },
        },
        vendor: { select: { id: true, name: true } },
      },
    });

    await tx.activityLog.create({
      data: {
        action: 'CREATED',
        entityType: 'PurchaseOrder',
        entityId: created.id,
        entityLabel: poNumber,
        description: `Purchase order ${poNumber} created for vendor ${vendor.name}`,
        performedBy,
        organizationId,
      },
    });

    // If linked to an approved order, advance it to MATERIALS_ORDERED
    if (linkedOrderId) {
      const linkedOrder = await tx.order.findUnique({
        where: { id: linkedOrderId },
        select: { status: true, orderNumber: true },
      });

      // Note: only the first PO creation advances the order to MATERIALS_ORDERED.
      // Multi-PO orders (multiple vendors) require manual status management after the first PO.
      if (linkedOrder?.status === 'APPROVED') {
        await tx.order.update({
          where: { id: linkedOrderId },
          data: { status: 'MATERIALS_ORDERED' },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: linkedOrderId,
            fromStatus: 'APPROVED',
            toStatus: 'MATERIALS_ORDERED',
            changedBy: performedBy,
            notes: `PO ${poNumber} created`,
            organizationId,
          },
        });
      }
    }

    return created;
  });

  logger.info('Purchase order created', { poId: po.id, poNumber, organizationId });
  return po;
}

// ─── Receive ──────────────────────────────────────────────────────────────────

export async function receivePOItems(input: ReceivePOInput): Promise<{
  receiving: { id: string; receivedAt: Date };
  updatedInventory: { inventoryItemId: string; quantityAdded: number }[];
  orderStatusUpdated: boolean;
}> {
  const { organizationId, purchaseOrderId, receivedBy, notes, items } = input;

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    include: { items: true },
  });

  if (!po || po.organizationId !== organizationId) {
    throw new AppError(404, 'Purchase order not found', 'PO_NOT_FOUND');
  }

  if (po.status === 'CANCELLED') {
    throw new AppError(400, 'Cannot receive items for a cancelled purchase order', 'PO_CANCELLED');
  }

  if (po.status === 'RECEIVED') {
    throw new AppError(400, 'All items already received for this purchase order', 'PO_ALREADY_RECEIVED');
  }

  const { receiving, updatedInventory, orderStatusUpdated } = await prisma.$transaction(async (tx) => {
    const localInventory: { inventoryItemId: string; quantityAdded: number }[] = [];
    let localOrderUpdated = false;

    // Create the receiving event
    const receiving = await tx.pOReceiving.create({
      data: {
        purchaseOrderId,
        receivedBy,
        notes,
        organizationId,
        items: {
          create: items.map((item) => ({
            purchaseOrderItemId: item.purchaseOrderItemId,
            inventoryItemId: item.inventoryItemId,
            quantityReceived: item.quantityReceived,
            notes: item.notes,
            isAccepted: item.isAccepted ?? true,
            organizationId,
          })),
        },
      },
      select: { id: true, receivedAt: true },
    });

    // Update inventory and PO item quantities
    for (const item of items) {
      // isAccepted=false: record in POReceivingItem but skip inventory and quantityRecv update.
      // A fully-rejected PO will stay at its current status — staff must manually mark it CANCELLED.
      if (item.quantityReceived <= 0 || item.isAccepted === false) continue;

      const poItem = po.items.find((i) => i.id === item.purchaseOrderItemId);
      if (!poItem) {
        throw new AppError(404, `PO item ${item.purchaseOrderItemId} not found`, 'PO_ITEM_NOT_FOUND');
      }

      const alreadyReceived = Number(poItem.quantityRecv);
      const remaining = poItem.quantity - alreadyReceived;
      if (item.quantityReceived > remaining) {
        throw new AppError(
          400,
          `Cannot receive ${item.quantityReceived} for "${poItem.description}". Only ${remaining} remaining.`,
          'OVER_RECEIVE',
        );
      }

      // Update the quantity received on the PO item
      await tx.purchaseOrderItem.update({
        where: { id: item.purchaseOrderItemId },
        data: { quantityRecv: { increment: item.quantityReceived } },
      });

      // Add stock if linked to an inventory item
      const inventoryItemId = item.inventoryItemId ?? poItem.inventoryItemId;
      if (inventoryItemId) {
        await receiveStock(tx as Prisma.TransactionClient, {
          organizationId,
          inventoryItemId,
          quantity: item.quantityReceived,
          performedBy: receivedBy,
        });

        localInventory.push({ inventoryItemId, quantityAdded: item.quantityReceived });
      }
    }

    // Determine new PO status
    const updatedPOItems = await tx.purchaseOrderItem.findMany({
      where: { purchaseOrderId },
      select: { quantity: true, quantityRecv: true },
    });

    const allReceived = updatedPOItems.every((i) => i.quantityRecv >= i.quantity);
    const anyReceived = updatedPOItems.some((i) => i.quantityRecv > 0);
    const newPOStatus = allReceived ? 'RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : po.status;

    await tx.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: {
        status: newPOStatus,
        ...(allReceived ? { receivedAt: new Date() } : {}),
      },
    });

    await tx.activityLog.create({
      data: {
        action: 'RECEIVED',
        entityType: 'PurchaseOrder',
        entityId: purchaseOrderId,
        entityLabel: po.poNumber,
        description: `Received ${items.length} line(s). PO status: ${newPOStatus}`,
        performedBy: receivedBy,
        organizationId,
      },
    });

    // Note: order advances to MATERIALS_RECEIVED only when THIS PO is fully received.
    // For multi-PO orders, staff must manually advance if only one PO is received.
    // If linked to a customer order and all items received, advance order to MATERIALS_RECEIVED
    if (po.linkedOrderId && allReceived) {
      const linkedOrder = await tx.order.findUnique({
        where: { id: po.linkedOrderId },
        select: { status: true, orderNumber: true },
      });

      if (linkedOrder?.status === 'MATERIALS_ORDERED') {
        await tx.order.update({
          where: { id: po.linkedOrderId },
          data: { status: 'MATERIALS_RECEIVED' },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: po.linkedOrderId,
            fromStatus: 'MATERIALS_ORDERED',
            toStatus: 'MATERIALS_RECEIVED',
            changedBy: receivedBy,
            notes: `PO ${po.poNumber} fully received`,
            organizationId,
          },
        });

        localOrderUpdated = true;
      }
    }

    return { receiving, updatedInventory: localInventory, orderStatusUpdated: localOrderUpdated };
  });

  logger.info('PO items received', { poId: purchaseOrderId, receivingId: receiving.id, itemCount: items.length });
  return { receiving, updatedInventory, orderStatusUpdated };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getPOsByOrder(
  organizationId: string,
  orderId: string,
): Promise<PurchaseOrder[]> {
  return prisma.purchaseOrder.findMany({
    where: { organizationId, linkedOrderId: orderId },
    include: {
      vendor: { select: { id: true, name: true, email: true } },
      items: { include: { inventoryItem: { select: { id: true, sku: true, name: true } } } },
      receivings: { include: { items: true }, orderBy: { receivedAt: 'desc' } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getPurchaseOrders(
  organizationId: string,
  options: {
    status?: PurchaseOrder['status'];
    vendorId?: string;
    page?: number;
    limit?: number;
  } = {},
) {
  const { status, vendorId, page = 1, limit = 25 } = options;
  const skip = (page - 1) * limit;

  const where: Prisma.PurchaseOrderWhereInput = {
    organizationId,
    ...(status ? { status } : {}),
    ...(vendorId ? { vendorId } : {}),
  };

  const [data, total] = await prisma.$transaction([
    prisma.purchaseOrder.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// ─── Get By ID ────────────────────────────────────────────────────────────────

export async function getPOById(organizationId: string, poId: string) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: {
      vendor: true,
      items: {
        include: {
          inventoryItem: { select: { id: true, sku: true, name: true } },
        },
      },
      receivings: {
        include: { items: true },
        orderBy: { receivedAt: 'desc' },
      },
    },
  });

  if (!po || po.organizationId !== organizationId) {
    throw new AppError(404, 'Purchase order not found', 'PO_NOT_FOUND');
  }

  return po;
}

// ─── Send to Vendor ───────────────────────────────────────────────────────────

export async function sendToVendor(input: {
  organizationId: string;
  poId: string;
  performedBy: string;
}): Promise<PurchaseOrder> {
  const { organizationId, poId, performedBy } = input;

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    select: {
      id: true,
      organizationId: true,
      status: true,
      poNumber: true,
      vendor: { select: { name: true } },
    },
  });

  if (!po || po.organizationId !== organizationId) {
    throw new AppError(404, 'Purchase order not found', 'PO_NOT_FOUND');
  }

  if (po.status !== 'DRAFT') {
    throw new AppError(
      400,
      `Cannot send PO in status "${po.status}". Must be DRAFT.`,
      'INVALID_PO_STATUS',
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.purchaseOrder.update({
      where: { id: poId },
      data: { status: 'SENT' },
    });

    await tx.activityLog.create({
      data: {
        action: 'UPDATED',
        entityType: 'PurchaseOrder',
        entityId: poId,
        entityLabel: po.poNumber,
        description: `PO ${po.poNumber} sent to vendor "${po.vendor.name}"`,
        performedBy,
        organizationId,
      },
    });

    return result;
  });

  logger.info('PO sent to vendor', { poId, poNumber: po.poNumber, organizationId });
  return updated;
}

// ─── Update PO Status ─────────────────────────────────────────────────────────

const VALID_PO_TRANSITIONS: Partial<Record<PurchaseOrder['status'], PurchaseOrder['status'][]>> = {
  DRAFT: ['SENT', 'CANCELLED'],
  SENT: ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
  PARTIALLY_RECEIVED: ['RECEIVED', 'CANCELLED'],
  RECEIVED: [],
  CANCELLED: [],
};

export async function updatePOStatus(input: {
  organizationId: string;
  poId: string;
  newStatus: PurchaseOrder['status'];
  notes?: string;
  performedBy: string;
}): Promise<PurchaseOrder> {
  const { organizationId, poId, newStatus, notes, performedBy } = input;

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    select: { id: true, organizationId: true, status: true, poNumber: true },
  });

  if (!po || po.organizationId !== organizationId) {
    throw new AppError(404, 'Purchase order not found', 'PO_NOT_FOUND');
  }

  const allowedNext = VALID_PO_TRANSITIONS[po.status] ?? [];
  if (!allowedNext.includes(newStatus)) {
    throw new AppError(
      400,
      `Cannot transition PO from ${po.status} to ${newStatus}`,
      'INVALID_STATUS_TRANSITION',
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.purchaseOrder.update({
      where: { id: poId },
      data: { status: newStatus },
    });

    await tx.activityLog.create({
      data: {
        action: 'STATUS_CHANGED',
        entityType: 'PurchaseOrder',
        entityId: poId,
        entityLabel: po.poNumber,
        description: `PO ${po.poNumber} status changed from ${po.status} to ${newStatus}${notes ? `: ${notes}` : ''}`,
        metadata: { from: po.status, to: newStatus, notes },
        performedBy,
        organizationId,
      },
    });

    return result;
  });

  logger.info('PO status updated', { poId, from: po.status, to: newStatus });
  return updated;
}
