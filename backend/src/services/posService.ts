import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { AppError } from '../middleware/errorHandler';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PosProduct {
  id: string;
  name: string;
  sku: string | null;
  categoryName: string;
  basePrice: number;
  image: string | null;
  garmentType: string;
  printMethod: string;
  priceTiers: Array<{ minQty: number; price: number }> | null;
  sizeUpcharges: Array<{ size: string; upcharge: number }> | null;
}

export interface SaleItem {
  productId: string;
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
  category?: string,
): Promise<PosProduct[]> {
  const items = await prisma.product.findMany({
    where: {
      organizationId: orgId,
      isActive: true,
      ...(category ? { category: { name: { contains: category, mode: 'insensitive' } } } : {}),
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
      basePrice: true,
      image: true,
      garmentType: true,
      printMethod: true,
      priceTiers: true,
      sizeUpcharges: true,
      category: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  });

  return items.map((item) => ({
    id: item.id,
    name: item.name,
    sku: item.sku ?? null,
    categoryName: item.category.name,
    basePrice: Number(item.basePrice),
    image: item.image ?? null,
    garmentType: item.garmentType,
    printMethod: item.printMethod,
    priceTiers: item.priceTiers as Array<{ minQty: number; price: number }> | null,
    sizeUpcharges: item.sizeUpcharges as Array<{ size: string; upcharge: number }> | null,
  }));
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

    // Verify all products belong to org and are active
    const productNames: Record<string, string> = {};
    for (const saleItem of items) {
      if (saleItem.quantity <= 0) {
        throw new AppError(400, 'Item quantity must be positive', 'INVALID_QUANTITY');
      }

      const product = await tx.product.findUnique({
        where: { id: saleItem.productId },
        select: { id: true, organizationId: true, name: true, isActive: true },
      });

      if (!product || product.organizationId !== orgId || !product.isActive) {
        throw new AppError(404, `Product ${saleItem.productId} not found`, 'PRODUCT_NOT_FOUND');
      }

      productNames[saleItem.productId] = product.name;
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
            productType: productNames[saleItem.productId] ?? 'POS Item',
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
