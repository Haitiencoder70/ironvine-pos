import { Prisma, Order, OrderStatus, OrderItem, OrderPriority, StockMovementType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { emitToOrg } from '../lib/socket';
import { AppError } from '../middleware/errorHandler';
import { generateOrderNumber } from '../utils/generators';
import type {
  CreateOrderInput,
  UpdateOrderStatusInput,
  GetOrdersInput,
  UseMaterialsInput,
  PaginatedResult,
} from '../types/services';

// ─── Workflow ─────────────────────────────────────────────────────────────────

const ORDER_WORKFLOW: OrderStatus[] = [
  'QUOTE',
  'PENDING_APPROVAL',
  'APPROVED',
  'MATERIALS_ORDERED',
  'MATERIALS_RECEIVED',
  'IN_PRODUCTION',
  'QUALITY_CHECK',
  'READY_TO_SHIP',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
];

const TERMINAL_STATUSES: OrderStatus[] = ['COMPLETED', 'CANCELLED'];

const VALID_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  QUOTE: ['PENDING_APPROVAL', 'APPROVED', 'CANCELLED'],
  PENDING_APPROVAL: ['APPROVED', 'CANCELLED', 'ON_HOLD'],
  APPROVED: ['MATERIALS_ORDERED', 'CANCELLED', 'ON_HOLD'],
  MATERIALS_ORDERED: ['MATERIALS_RECEIVED', 'CANCELLED', 'ON_HOLD'],
  MATERIALS_RECEIVED: ['IN_PRODUCTION', 'ON_HOLD'],
  IN_PRODUCTION: ['QUALITY_CHECK', 'ON_HOLD'],
  QUALITY_CHECK: ['READY_TO_SHIP', 'IN_PRODUCTION', 'ON_HOLD'],
  READY_TO_SHIP: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['COMPLETED'],
  ON_HOLD: ['APPROVED', 'MATERIALS_ORDERED', 'IN_PRODUCTION', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createOrder(input: CreateOrderInput): Promise<Order & { items: OrderItem[] }> {
  const {
    organizationId,
    customerId,
    orderNumberPrefix = 'ORD',
    priority = 'NORMAL',
    dueDate,
    notes,
    internalNotes,
    designNotes,
    designFiles = [],
    items,
    performedBy,
  } = input;

  // Verify customer belongs to org
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, organizationId: true },
  });

  if (!customer || customer.organizationId !== organizationId) {
    throw new AppError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');
  }

  if (items.length === 0) {
    throw new AppError(400, 'Order must have at least one item', 'EMPTY_ORDER');
  }

  // Note: sequence number is reserved before the transaction. Gaps can occur on rollback.
  // This is intentional — gaps in order numbers are acceptable and expected.
  const orderNumber = await generateOrderNumber(organizationId, orderNumberPrefix);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { taxRate: true },
  });

  const taxRate = org?.taxRate ? Number(org.taxRate) : 0;
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        organizationId,
        customerId,
        priority,
        status: 'QUOTE',
        dueDate,
        notes,
        internalNotes,
        designNotes,
        designFiles,
        subtotal,
        taxAmount,
        total,
        items: {
          create: items.map((item) => ({
            productType: item.productType,
            size: item.size,
            color: item.color,
            sleeveType: item.sleeveType,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.quantity * item.unitPrice,
            printMethod: item.printMethod,
            printLocations: item.printLocations ?? [],
            description: item.description,
            organizationId,
            ...(item.requiredMaterials && item.requiredMaterials.length > 0
              ? {
                  requiredMaterials: {
                    create: item.requiredMaterials.map((mat) => ({
                      inventoryItemId: mat.inventoryItemId,
                      description: mat.description,
                      quantityRequired: mat.quantityRequired,
                      quantityUnit: mat.quantityUnit ?? 'units',
                      organizationId,
                    })),
                  },
                }
              : {}),
          })),
        },
      },
      include: { items: true },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: created.id,
        fromStatus: null,
        toStatus: 'QUOTE',
        changedBy: performedBy,
        notes: 'Order created',
        organizationId,
      },
    });

    await tx.activityLog.create({
      data: {
        action: 'CREATED',
        entityType: 'Order',
        entityId: created.id,
        entityLabel: orderNumber,
        description: `Order ${orderNumber} created`,
        performedBy,
        organizationId,
      },
    });

    return created;
  });

  logger.info('Order created', { orderId: order.id, orderNumber: order.orderNumber, organizationId });
  emitToOrg(organizationId, 'order:created', order);
  return order;
}

// ─── Status Updates ───────────────────────────────────────────────────────────

export async function updateOrderStatus(input: UpdateOrderStatusInput): Promise<Order> {
  const { organizationId, orderId, newStatus, notes, performedBy } = input;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, organizationId: true, status: true, orderNumber: true },
  });

  if (!order || order.organizationId !== organizationId) {
    throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
  }

  const allowedNext = VALID_TRANSITIONS[order.status] ?? [];
  if (!allowedNext.includes(newStatus)) {
    throw new AppError(
      400,
      `Cannot transition order from ${order.status} to ${newStatus}`,
      'INVALID_STATUS_TRANSITION',
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.order.update({
      where: { id: orderId },
      data: { status: newStatus },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: newStatus,
        changedBy: performedBy,
        notes,
        organizationId,
      },
    });

    await tx.activityLog.create({
      data: {
        action: 'STATUS_CHANGED',
        entityType: 'Order',
        entityId: orderId,
        entityLabel: order.orderNumber,
        description: `Status changed from ${order.status} to ${newStatus}`,
        metadata: { from: order.status, to: newStatus },
        performedBy,
        organizationId,
      },
    });

    // When order is cancelled, unreserve all materials reserved for this order
    if (newStatus === 'CANCELLED') {
      const reservedItems = await tx.$queryRaw<
        Array<{ inventoryItemId: string; totalReserved: bigint; currentReserved: number }>
      >`
        SELECT sm."inventoryItemId",
               SUM(sm.quantity) as "totalReserved",
               ii."quantityReserved" as "currentReserved"
        FROM "StockMovement" sm
        JOIN "InventoryItem" ii ON ii.id = sm."inventoryItemId"
        WHERE sm."orderId" = ${orderId}
          AND sm."organizationId" = ${organizationId}
          AND sm.type = 'RESERVED'::"StockMovementType"
        GROUP BY sm."inventoryItemId", ii."quantityReserved"
        FOR UPDATE OF ii
      `;

      for (const reserved of reservedItems) {
        const toUnreserve = Math.min(Number(reserved.totalReserved), reserved.currentReserved);
        if (toUnreserve > 0) {
          await tx.inventoryItem.update({
            where: { id: reserved.inventoryItemId },
            data: { quantityReserved: { decrement: toUnreserve } },
          });
          await tx.stockMovement.create({
            data: {
              inventoryItemId: reserved.inventoryItemId,
              type: StockMovementType.UNRESERVED,
              quantity: toUnreserve,
              reason: `${performedBy}: Order cancelled`,
              orderId,
              organizationId,
            },
          });
        }
      }
    }

    return result;
  });

  logger.info('Order status updated', { orderId, from: order.status, to: newStatus });
  emitToOrg(organizationId, 'order:status-changed', updated);
  return updated;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getOrders(input: GetOrdersInput): Promise<PaginatedResult<Order & {
  customer: { id: string; firstName: string; lastName: string; company: string | null };
  _count: { items: number };
}>> {
  const {
    organizationId,
    status,
    customerId,
    priority,
    search,
    dateFrom,
    dateTo,
    page = 1,
    limit = 25,
  } = input;

  const skip = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = {
    organizationId,
    ...(status
      ? { status: Array.isArray(status) ? { in: status } : status }
      : {}),
    ...(customerId ? { customerId } : {}),
    ...(priority ? { priority } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { orderNumber: { contains: search, mode: 'insensitive' } },
            { customer: { firstName: { contains: search, mode: 'insensitive' } } },
            { customer: { lastName: { contains: search, mode: 'insensitive' } } },
            { customer: { company: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [data, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, company: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getOrderById(organizationId: string, orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      items: {
        include: {
          requiredMaterials: {
            include: { inventoryItem: true },
          },
        },
      },
      statusHistory: { orderBy: { createdAt: 'desc' } },
      purchaseOrders: {
        include: { vendor: true, items: true },
        orderBy: { createdAt: 'desc' },
      },
      shipments: { orderBy: { createdAt: 'desc' } },
      materialUsages: {
        include: { inventoryItem: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!order || order.organizationId !== organizationId) {
    throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
  }

  return order;
}

// ─── Update Order Details ─────────────────────────────────────────────────────

export interface UpdateOrderInput {
  organizationId: string;
  orderId: string;
  priority?: OrderPriority;
  dueDate?: Date | null;
  notes?: string;
  internalNotes?: string;
  designNotes?: string;
  designFiles?: string[];
  discount?: number;
  performedBy: string;
}

export async function updateOrder(input: UpdateOrderInput): Promise<Order> {
  const { organizationId, orderId, performedBy, ...updates } = input;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, organizationId: true, orderNumber: true },
  });

  if (!order || order.organizationId !== organizationId) {
    throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.order.update({
      where: { id: orderId },
      data: updates,
    });

    await tx.activityLog.create({
      data: {
        action: 'UPDATED',
        entityType: 'Order',
        entityId: orderId,
        entityLabel: order.orderNumber,
        description: `Order ${order.orderNumber} details updated`,
        performedBy,
        organizationId,
      },
    });

    return result;
  });

  logger.info('Order updated', { orderId, organizationId });
  emitToOrg(organizationId, 'order:updated', updated);
  return updated;
}

// ─── Material Usage ───────────────────────────────────────────────────────────

export async function useMaterials(input: UseMaterialsInput): Promise<void> {
  const { organizationId, orderId, materials, performedBy } = input;

  if (materials.length === 0) {
    throw new AppError(400, 'Must provide at least one material', 'EMPTY_MATERIALS');
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, organizationId: true, status: true, orderNumber: true },
  });

  if (!order || order.organizationId !== organizationId) {
    throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
  }

  if (order.status !== 'IN_PRODUCTION') {
    throw new AppError(
      400,
      `Materials can only be used when order is IN_PRODUCTION. Current status: ${order.status}`,
      'INVALID_ORDER_STATUS',
    );
  }

  await prisma.$transaction(async (tx) => {
    for (const mat of materials) {
      if (mat.quantityUsed <= 0) {
        throw new AppError(400, 'Material quantity used must be positive', 'INVALID_QUANTITY');
      }

      const item = await tx.inventoryItem.findUnique({
        where: { id: mat.inventoryItemId },
        select: {
          id: true,
          organizationId: true,
          quantityOnHand: true,
          quantityReserved: true,
          name: true,
        },
      });

      if (!item || item.organizationId !== organizationId) {
        throw new AppError(404, `Inventory item ${mat.inventoryItemId} not found`, 'INVENTORY_NOT_FOUND');
      }

      const available = item.quantityOnHand - item.quantityReserved;
      if (available < mat.quantityUsed) {
        throw new AppError(
          400,
          `Insufficient stock for "${item.name}". Available: ${available}, needed: ${mat.quantityUsed}`,
          'INSUFFICIENT_STOCK',
        );
      }

      const reservedToDeduct = Math.min(mat.quantityUsed, item.quantityReserved);

      await tx.inventoryItem.update({
        where: { id: mat.inventoryItemId },
        data: {
          quantityOnHand: { decrement: mat.quantityUsed },
          quantityReserved: { decrement: reservedToDeduct },
        },
      });

      await tx.stockMovement.create({
        data: {
          inventoryItemId: mat.inventoryItemId,
          type: StockMovementType.OUT,
          quantity: mat.quantityUsed,
          reason: `${performedBy}: Used in order ${order.orderNumber}${mat.notes ? ` - ${mat.notes}` : ''}`,
          orderId,
          organizationId,
        },
      });

      await tx.materialUsage.create({
        data: {
          orderId,
          inventoryItemId: mat.inventoryItemId,
          quantityUsed: mat.quantityUsed,
          quantityUnit: mat.quantityUnit ?? 'units',
          notes: mat.notes,
          usedBy: performedBy,
          organizationId,
        },
      });
    }

    await tx.activityLog.create({
      data: {
        action: 'UPDATED',
        entityType: 'Order',
        entityId: orderId,
        entityLabel: order.orderNumber,
        description: `Materials used: ${materials.length} item(s) deducted from inventory`,
        performedBy,
        organizationId,
      },
    });
  });

  logger.info('Materials used for order', { orderId, materialCount: materials.length });
}

// ─── Workflow Progress ────────────────────────────────────────────────────────

export function getOrderWorkflow(currentStatus: OrderStatus): {
  steps: { status: OrderStatus; label: string; isCompleted: boolean; isCurrent: boolean }[];
  currentIndex: number;
  nextStatus: OrderStatus | null;
  canProgress: boolean;
} {
  // Side-states are not part of the linear workflow
  if (currentStatus === 'ON_HOLD' || currentStatus === 'CANCELLED') {
    const STATUS_LABELS_SIDE: Record<OrderStatus, string> = {
      QUOTE: 'Quote',
      PENDING_APPROVAL: 'Pending Approval',
      APPROVED: 'Approved',
      MATERIALS_ORDERED: 'Materials Ordered',
      MATERIALS_RECEIVED: 'Materials Received',
      IN_PRODUCTION: 'In Production',
      QUALITY_CHECK: 'Quality Check',
      READY_TO_SHIP: 'Ready to Ship',
      SHIPPED: 'Shipped',
      DELIVERED: 'Delivered',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      ON_HOLD: 'On Hold',
    };
    return {
      steps: ORDER_WORKFLOW.map((status) => ({
        status,
        label: STATUS_LABELS_SIDE[status],
        isCompleted: false,
        isCurrent: false,
      })),
      currentIndex: -1,
      nextStatus: null,
      canProgress: false,
    };
  }

  const STATUS_LABELS: Record<OrderStatus, string> = {
    QUOTE: 'Quote',
    PENDING_APPROVAL: 'Pending Approval',
    APPROVED: 'Approved',
    MATERIALS_ORDERED: 'Materials Ordered',
    MATERIALS_RECEIVED: 'Materials Received',
    IN_PRODUCTION: 'In Production',
    QUALITY_CHECK: 'Quality Check',
    READY_TO_SHIP: 'Ready to Ship',
    SHIPPED: 'Shipped',
    DELIVERED: 'Delivered',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    ON_HOLD: 'On Hold',
  };

  const currentIndex = ORDER_WORKFLOW.indexOf(currentStatus);
  const isTerminal = TERMINAL_STATUSES.includes(currentStatus);

  const steps = ORDER_WORKFLOW.map((status, index) => ({
    status,
    label: STATUS_LABELS[status],
    isCompleted: index < currentIndex,
    isCurrent: status === currentStatus,
  }));

  const allowedNext = VALID_TRANSITIONS[currentStatus] ?? [];
  const nextInWorkflow = ORDER_WORKFLOW[currentIndex + 1];
  const nextStatus = nextInWorkflow && allowedNext.includes(nextInWorkflow) ? nextInWorkflow : null;

  return {
    steps,
    currentIndex,
    nextStatus,
    canProgress: !isTerminal && nextStatus !== null,
  };
}
