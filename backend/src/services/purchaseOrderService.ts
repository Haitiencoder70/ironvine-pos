import { Prisma, PurchaseOrder } from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';
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

  const poNumber = await generatePONumber(organizationId);

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
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
            lineTotal: item.quantity * item.unitCost,
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

  const updatedInventory: { inventoryItemId: string; quantityAdded: number }[] = [];
  let orderStatusUpdated = false;

  const result = await prisma.$transaction(async (tx) => {
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
      if (item.quantityReceived <= 0 || item.isAccepted === false) continue;

      const poItem = po.items.find((i) => i.id === item.purchaseOrderItemId);
      if (!poItem) {
        throw new AppError(404, `PO item ${item.purchaseOrderItemId} not found`, 'PO_ITEM_NOT_FOUND');
      }

      // Update the quantity received on the PO item
      await tx.purchaseOrderItem.update({
        where: { id: item.purchaseOrderItemId },
        data: { quantityRecv: { increment: item.quantityReceived } },
      });

      // Add stock if linked to an inventory item
      const inventoryItemId = item.inventoryItemId ?? poItem.inventoryItemId;
      if (inventoryItemId) {
        await receiveStock(tx, {
          organizationId,
          inventoryItemId,
          quantity: item.quantityReceived,
          performedBy: receivedBy,
        });

        updatedInventory.push({ inventoryItemId, quantityAdded: item.quantityReceived });
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

        orderStatusUpdated = true;
      }
    }

    return receiving;
  });

  logger.info('PO items received', { poId: purchaseOrderId, receivingId: result.id, itemCount: items.length });
  return { receiving: result, updatedInventory, orderStatusUpdated };
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
