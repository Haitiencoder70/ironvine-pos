import { InventoryCategory, StockMovementType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { AppError } from '../middleware/errorHandler';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PosProduct {
  id: string;
  name: string;
  sku: string;
  category: InventoryCategory;
  costPrice: number;
  quantityAvailable: number;
  brand: string | null;
  size: string | null;
  color: string | null;
}

export interface SaleItem {
  inventoryItemId: string;
  quantity: number;
  unitPrice: number;
}

export type PaymentMethod = 'CASH' | 'CARD' | 'SPLIT';

export interface Discount {
  type: 'FLAT' | 'PERCENT';
  value: number;
}

export interface CompleteSaleInput {
  orgId: string;
  userId: string;
  items: SaleItem[];
  paymentMethod: PaymentMethod;
  amountTendered: number;
  discount: Discount;
}

export interface SaleResult {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    total: number;
    notes: string | null;
    createdAt: Date;
    items: Array<{
      id: string;
      productType: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }>;
  };
  changeDue: number;
  taxAmount: number;
}

export interface SaleHistoryResult {
  data: Array<{
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    notes: string | null;
    createdAt: Date;
    items: Array<{
      id: string;
      productType: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }>;
  }>;
  total: number;
  limit: number;
  offset: number;
}

// ─── Walk-In Customer Sentinel ────────────────────────────────────────────────

/**
 * Returns (or creates) a walk-in customer for the given org.
 * The Order schema requires a customerId, so POS sales use a sentinel record.
 */
async function getOrCreateWalkInCustomer(orgId: string, tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]): Promise<string> {
  const WALKIN_EMAIL = '__walkin__@pos.internal';

  const existing = await tx.customer.findUnique({
    where: { email_organizationId: { email: WALKIN_EMAIL, organizationId: orgId } },
    select: { id: true },
  });

  if (existing) return existing.id;

  const created = await tx.customer.create({
    data: {
      firstName: 'Walk-In',
      lastName: 'Customer',
      email: WALKIN_EMAIL,
      organizationId: orgId,
    },
    select: { id: true },
  });

  return created.id;
}

// ─── getProducts ──────────────────────────────────────────────────────────────

export async function getProducts(
  orgId: string,
  search?: string,
  category?: InventoryCategory,
): Promise<PosProduct[]> {
  const items = await prisma.inventoryItem.findMany({
    where: {
      organizationId: orgId,
      isActive: true,
      // quantityAvailable is computed as quantityOnHand - quantityReserved;
      // filter where on-hand exceeds reserved (available > 0)
      ...(category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      sku: true,
      category: true,
      costPrice: true,
      quantityOnHand: true,
      quantityReserved: true,
      brand: true,
      size: true,
      color: true,
    },
    orderBy: { name: 'asc' },
  });

  return items
    .map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      costPrice: Number(item.costPrice),
      quantityAvailable: item.quantityOnHand - item.quantityReserved,
      brand: item.brand,
      size: item.size,
      color: item.color,
    }))
    .filter((item) => item.quantityAvailable > 0);
}

// ─── completeSale ─────────────────────────────────────────────────────────────

export async function completeSale(input: CompleteSaleInput): Promise<SaleResult> {
  const { orgId, userId, items, paymentMethod, amountTendered, discount } = input;

  if (items.length === 0) {
    throw new AppError(400, 'Sale must have at least one item', 'EMPTY_SALE');
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { taxRate: true },
  });

  const taxRate = org?.taxRate ? Number(org.taxRate) : 0;

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  let discountAmount = 0;
  if (discount.value > 0) {
    discountAmount =
      discount.type === 'PERCENT'
        ? subtotal * (discount.value / 100)
        : discount.value;
  }

  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * taxRate;
  const total = taxableAmount + taxAmount;
  const changeDue = Math.max(0, amountTendered - total);

  const orderNumber = `POS-${Date.now()}`;

  const order = await prisma.$transaction(async (tx) => {
    const walkInCustomerId = await getOrCreateWalkInCustomer(orgId, tx);

    // Verify all inventory items belong to org and have sufficient stock
    for (const saleItem of items) {
      if (saleItem.quantity <= 0) {
        throw new AppError(400, 'Item quantity must be positive', 'INVALID_QUANTITY');
      }

      const invItem = await tx.inventoryItem.findUnique({
        where: { id: saleItem.inventoryItemId },
        select: {
          id: true,
          organizationId: true,
          name: true,
          quantityOnHand: true,
          quantityReserved: true,
          isActive: true,
        },
      });

      if (!invItem || invItem.organizationId !== orgId || !invItem.isActive) {
        throw new AppError(404, `Inventory item ${saleItem.inventoryItemId} not found`, 'INVENTORY_NOT_FOUND');
      }

      const available = invItem.quantityOnHand - invItem.quantityReserved;
      if (available < saleItem.quantity) {
        throw new AppError(
          400,
          `Insufficient stock for "${invItem.name}". Available: ${available}, requested: ${saleItem.quantity}`,
          'INSUFFICIENT_STOCK',
        );
      }
    }

    // Create order
    const created = await tx.order.create({
      data: {
        orderNumber,
        organizationId: orgId,
        customerId: walkInCustomerId,
        status: 'COMPLETED',
        priority: 'NORMAL',
        subtotal,
        taxAmount,
        discount: discountAmount,
        total,
        notes: `POS walk-in sale | Payment: ${paymentMethod}`,
        items: {
          create: items.map((saleItem) => ({
            productType: 'POS Item',
            quantity: saleItem.quantity,
            unitPrice: saleItem.unitPrice,
            lineTotal: saleItem.quantity * saleItem.unitPrice,
            organizationId: orgId,
          })),
        },
      },
      include: {
        items: {
          select: {
            id: true,
            productType: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
          },
        },
      },
    });

    // Decrement quantityOnHand for each inventory item
    for (const saleItem of items) {
      await tx.inventoryItem.update({
        where: { id: saleItem.inventoryItemId },
        data: { quantityOnHand: { decrement: saleItem.quantity } },
      });

      await tx.stockMovement.create({
        data: {
          inventoryItemId: saleItem.inventoryItemId,
          type: StockMovementType.OUT,
          quantity: saleItem.quantity,
          reason: `POS sale ${orderNumber} by ${userId}`,
          orderId: created.id,
          organizationId: orgId,
        },
      });
    }

    await tx.activityLog.create({
      data: {
        action: 'CREATED',
        entityType: 'Order',
        entityId: created.id,
        entityLabel: orderNumber,
        description: `POS sale ${orderNumber} completed. Total: ${total.toFixed(2)}`,
        performedBy: userId,
        organizationId: orgId,
      },
    });

    return created;
  });

  logger.info('POS sale completed', { orderNumber, orgId, userId, total });

  return {
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      subtotal,
      taxAmount,
      discountAmount,
      total,
      notes: order.notes,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        productType: item.productType,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
      })),
    },
    changeDue,
    taxAmount,
  };
}

// ─── getSaleHistory ───────────────────────────────────────────────────────────

export async function getSaleHistory(
  orgId: string,
  limit = 25,
  offset = 0,
): Promise<SaleHistoryResult> {
  const where = {
    organizationId: orgId,
    orderNumber: { startsWith: 'POS-' },
  };

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        notes: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            productType: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
          },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    data: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      total: Number(order.total),
      notes: order.notes,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        productType: item.productType,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
      })),
    })),
    total,
    limit,
    offset,
  };
}
