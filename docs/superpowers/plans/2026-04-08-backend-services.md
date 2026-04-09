# Backend Services Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the three core business service files (inventory, order, purchase order) plus three additional generator functions on top of the existing scaffold.

**Architecture:** Services are plain TypeScript modules that accept `organizationId` as an explicit parameter — no middleware magic. Every write uses Prisma transactions for atomicity. Services import from `src/lib/prisma.ts` and `src/lib/logger.ts`. No JWT/bcrypt — Clerk handles auth upstream in middleware.

**Tech Stack:** Prisma 5, TypeScript strict, Zod (validation in routes, not services), existing `AppError` from `src/middleware/errorHandler.ts`.

---

## What Already Exists (DO NOT recreate)

- `backend/src/config/env.ts` — Zod env validation
- `backend/src/lib/prisma.ts` — Prisma client singleton
- `backend/src/lib/logger.ts` — Winston logger
- `backend/src/middleware/auth.ts` — Clerk auth (requireAuth, requireRole)
- `backend/src/middleware/errorHandler.ts` — AppError class + global error handler
- `backend/src/middleware/validate.ts` — Zod request validation
- `backend/src/utils/generators.ts` — generateOrderNumber, generatePONumber, generateInviteToken, generateSlug (with atomic DB sequence counters)

## File Map

### Modify
- `backend/src/utils/generators.ts` — add `generateSKU`, `generateShipmentNumber`, `generateCustomerNumber`

### Create
- `backend/src/types/services.ts` — shared input/output types for all services
- `backend/src/services/inventoryService.ts` — stock management (must be built before order/PO services)
- `backend/src/services/orderService.ts` — full order lifecycle
- `backend/src/services/purchaseOrderService.ts` — PO creation and receiving

---

## Task 1: Additional Generators

**Files:**
- Modify: `backend/src/utils/generators.ts`

- [ ] **Step 1: Add `generateSKU`, `generateShipmentNumber`, `generateCustomerNumber` to `backend/src/utils/generators.ts`**

Append to the end of the existing file (after `generateSlug`):

```typescript
/**
 * Generates a unique SKU for a new inventory item.
 * Format: {CATEGORY_PREFIX}-{TIMESTAMP_BASE36}-{RANDOM_HEX4}
 * e.g. BLK-M0XFQZ-A3F1
 */
export function generateSKU(category: string): string {
  const prefix = category
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3)
    .padEnd(3, 'X');
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generates a sequential shipment number scoped to an organization and month.
 * Format: SHP-{YYYYMM}-{NNNN} e.g. SHP-202401-0001
 * Thread-safe: uses an atomic database counter.
 */
export async function generateShipmentNumber(organizationId: string): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const yearMonth = `${year}${month}`;

  const counterKey = `shipment:${yearMonth}`;
  const sequence = await nextSequenceValue(organizationId, counterKey);

  const shipmentNumber = `SHP-${yearMonth}-${String(sequence).padStart(4, '0')}`;
  logger.debug(`Generated shipment number: ${shipmentNumber}`);
  return shipmentNumber;
}

/**
 * Generates a sequential customer number scoped to an organization.
 * Format: CUST-{NNNNNN} e.g. CUST-000042 (not month-scoped — sequential per org lifetime)
 * Thread-safe: uses an atomic database counter.
 */
export async function generateCustomerNumber(organizationId: string): Promise<string> {
  const counterKey = 'customer';
  const sequence = await nextSequenceValue(organizationId, counterKey);

  const customerNumber = `CUST-${String(sequence).padStart(6, '0')}`;
  logger.debug(`Generated customer number: ${customerNumber}`);
  return customerNumber;
}
```

Note: `generateSKU` uses `randomBytes` — add `import { randomBytes } from 'node:crypto';` to the top of the file if it's not already there. Check the existing imports first.

`nextSequenceValue` is already defined in the file as a private helper — the new functions can use it directly.

- [ ] **Step 2: Verify typecheck**

```bash
cd backend && npm run typecheck
```

Expected: zero errors.

---

## Task 2: Shared Service Types

**Files:**
- Create: `backend/src/types/services.ts`

- [ ] **Step 1: Create `backend/src/types/services.ts`**

```typescript
import {
  OrderStatus,
  OrderPriority,
  PrintMethod,
  PrintLocation,
  StockMovementType,
  InventoryCategory,
} from '@prisma/client';

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationInput {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Order Service Types ──────────────────────────────────────────────────────

export interface RequiredMaterialInput {
  inventoryItemId?: string;
  description: string;
  quantityRequired: number;
  quantityUnit?: string;
}

export interface CreateOrderItemInput {
  productType: string;
  size?: string;
  color?: string;
  sleeveType?: string;
  quantity: number;
  unitPrice: number;
  printMethod?: PrintMethod;
  printLocations?: PrintLocation[];
  description?: string;
  requiredMaterials?: RequiredMaterialInput[];
}

export interface CreateOrderInput {
  organizationId: string;
  customerId: string;
  orderNumberPrefix?: string;
  priority?: OrderPriority;
  dueDate?: Date;
  notes?: string;
  internalNotes?: string;
  designNotes?: string;
  designFiles?: string[];
  items: CreateOrderItemInput[];
  performedBy: string;
}

export interface UpdateOrderStatusInput {
  organizationId: string;
  orderId: string;
  newStatus: OrderStatus;
  notes?: string;
  performedBy: string;
}

export interface GetOrdersInput extends PaginationInput {
  organizationId: string;
  status?: OrderStatus | OrderStatus[];
  customerId?: string;
  priority?: OrderPriority;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface UseMaterialsInput {
  organizationId: string;
  orderId: string;
  materials: {
    inventoryItemId: string;
    quantityUsed: number;
    quantityUnit?: string;
    notes?: string;
  }[];
  performedBy: string;
}

// ─── Inventory Service Types ──────────────────────────────────────────────────

export interface ReserveMaterialsInput {
  organizationId: string;
  inventoryItemId: string;
  quantity: number;
  orderId?: string;
  performedBy: string;
}

export interface AdjustStockInput {
  organizationId: string;
  inventoryItemId: string;
  quantityDelta: number;
  type: StockMovementType;
  reason?: string;
  orderId?: string;
  performedBy: string;
}

export interface GetLowStockInput {
  organizationId: string;
  category?: InventoryCategory;
}

// ─── Purchase Order Service Types ────────────────────────────────────────────

export interface CreatePOItemInput {
  inventoryItemId?: string;
  description: string;
  quantity: number;
  unitCost: number;
}

export interface CreatePOInput {
  organizationId: string;
  vendorId: string;
  linkedOrderId?: string;
  notes?: string;
  expectedDate?: Date;
  items: CreatePOItemInput[];
  performedBy: string;
}

export interface ReceivePOItemInput {
  purchaseOrderItemId: string;
  inventoryItemId?: string;
  quantityReceived: number;
  notes?: string;
  isAccepted?: boolean;
}

export interface ReceivePOInput {
  organizationId: string;
  purchaseOrderId: string;
  receivedBy: string;
  notes?: string;
  items: ReceivePOItemInput[];
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd backend && npm run typecheck
```

Expected: zero errors.

---

## Task 3: Inventory Service

**Files:**
- Create: `backend/src/services/inventoryService.ts`

- [ ] **Step 1: Create `backend/src/services/inventoryService.ts`**

```typescript
import { Prisma, InventoryItem, StockMovementType, InventoryCategory } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { AppError } from '../middleware/errorHandler';
import type {
  ReserveMaterialsInput,
  AdjustStockInput,
  GetLowStockInput,
  PaginatedResult,
  PaginationInput,
} from '../types/services';

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getInventoryItems(
  organizationId: string,
  options: PaginationInput & {
    category?: InventoryCategory;
    search?: string;
    lowStockOnly?: boolean;
  } = {},
): Promise<PaginatedResult<InventoryItem>> {
  const { page = 1, limit = 50, category, search, lowStockOnly } = options;
  const skip = (page - 1) * limit;

  const where: Prisma.InventoryItemWhereInput = {
    organizationId,
    isActive: true,
    ...(category ? { category } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(lowStockOnly
      ? {
          quantityOnHand: { lte: prisma.inventoryItem.fields.reorderPoint as never },
        }
      : {}),
  };

  const [data, total] = await prisma.$transaction([
    prisma.inventoryItem.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
    }),
    prisma.inventoryItem.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getLowStockItems(
  input: GetLowStockInput,
): Promise<InventoryItem[]> {
  const { organizationId, category } = input;

  return prisma.$queryRaw<InventoryItem[]>`
    SELECT * FROM inventory_items
    WHERE organization_id = ${organizationId}
      AND is_active = true
      AND quantity_on_hand <= reorder_point
      ${category ? Prisma.sql`AND category = ${category}::"InventoryCategory"` : Prisma.empty}
    ORDER BY (reorder_point - quantity_on_hand) DESC
  `;
}

export function getAvailableQuantity(item: {
  quantityOnHand: number;
  quantityReserved: number;
}): number {
  return Math.max(0, item.quantityOnHand - item.quantityReserved);
}

// ─── Stock Adjustments ────────────────────────────────────────────────────────

export async function adjustStock(input: AdjustStockInput): Promise<InventoryItem> {
  const { organizationId, inventoryItemId, quantityDelta, type, reason, orderId, performedBy } =
    input;

  return prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      select: { id: true, organizationId: true, quantityOnHand: true, name: true },
    });

    if (!item) {
      throw new AppError(404, 'Inventory item not found', 'INVENTORY_NOT_FOUND');
    }

    if (item.organizationId !== organizationId) {
      throw new AppError(403, 'Access denied', 'FORBIDDEN');
    }

    const newQuantity = item.quantityOnHand + quantityDelta;
    if (newQuantity < 0) {
      throw new AppError(
        400,
        `Insufficient stock for "${item.name}". Available: ${item.quantityOnHand}, requested: ${Math.abs(quantityDelta)}`,
        'INSUFFICIENT_STOCK',
      );
    }

    const [updated] = await Promise.all([
      tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { quantityOnHand: newQuantity },
      }),
      tx.stockMovement.create({
        data: {
          inventoryItemId,
          type,
          quantity: quantityDelta,
          reason,
          orderId,
          organizationId,
          performedBy,
        } as Prisma.StockMovementUncheckedCreateInput & { performedBy: string },
      }),
    ]);

    logger.info('Stock adjusted', {
      inventoryItemId,
      type,
      delta: quantityDelta,
      newQuantity,
      performedBy,
    });

    return updated;
  });
}

// ─── Reservation ──────────────────────────────────────────────────────────────

export async function reserveMaterials(input: ReserveMaterialsInput): Promise<InventoryItem> {
  const { organizationId, inventoryItemId, quantity, orderId, performedBy } = input;

  return prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      select: {
        id: true,
        organizationId: true,
        quantityOnHand: true,
        quantityReserved: true,
        name: true,
      },
    });

    if (!item) {
      throw new AppError(404, 'Inventory item not found', 'INVENTORY_NOT_FOUND');
    }

    if (item.organizationId !== organizationId) {
      throw new AppError(403, 'Access denied', 'FORBIDDEN');
    }

    const available = item.quantityOnHand - item.quantityReserved;
    if (available < quantity) {
      throw new AppError(
        400,
        `Cannot reserve ${quantity} of "${item.name}". Available: ${available}`,
        'INSUFFICIENT_STOCK',
      );
    }

    const [updated] = await Promise.all([
      tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { quantityReserved: { increment: quantity } },
      }),
      tx.stockMovement.create({
        data: {
          inventoryItemId,
          type: StockMovementType.RESERVED,
          quantity,
          orderId,
          organizationId,
          performedBy,
        } as Prisma.StockMovementUncheckedCreateInput & { performedBy: string },
      }),
    ]);

    return updated;
  });
}

export async function unreserveMaterials(input: ReserveMaterialsInput): Promise<InventoryItem> {
  const { organizationId, inventoryItemId, quantity, orderId, performedBy } = input;

  return prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      select: {
        id: true,
        organizationId: true,
        quantityReserved: true,
        name: true,
      },
    });

    if (!item) {
      throw new AppError(404, 'Inventory item not found', 'INVENTORY_NOT_FOUND');
    }

    if (item.organizationId !== organizationId) {
      throw new AppError(403, 'Access denied', 'FORBIDDEN');
    }

    const toUnreserve = Math.min(quantity, item.quantityReserved);

    const [updated] = await Promise.all([
      tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { quantityReserved: { decrement: toUnreserve } },
      }),
      tx.stockMovement.create({
        data: {
          inventoryItemId,
          type: StockMovementType.UNRESERVED,
          quantity: toUnreserve,
          orderId,
          organizationId,
          performedBy,
        } as Prisma.StockMovementUncheckedCreateInput & { performedBy: string },
      }),
    ]);

    return updated;
  });
}

// ─── Receive Stock ────────────────────────────────────────────────────────────

export async function receiveStock(
  tx: Prisma.TransactionClient,
  params: {
    organizationId: string;
    inventoryItemId: string;
    quantity: number;
    orderId?: string;
    performedBy: string;
  },
): Promise<InventoryItem> {
  const { organizationId, inventoryItemId, quantity, orderId, performedBy } = params;

  const item = await tx.inventoryItem.findUnique({
    where: { id: inventoryItemId },
    select: { id: true, organizationId: true },
  });

  if (!item) {
    throw new AppError(404, 'Inventory item not found', 'INVENTORY_NOT_FOUND');
  }

  if (item.organizationId !== organizationId) {
    throw new AppError(403, 'Access denied', 'FORBIDDEN');
  }

  const [updated] = await Promise.all([
    tx.inventoryItem.update({
      where: { id: inventoryItemId },
      data: { quantityOnHand: { increment: quantity } },
    }),
    tx.stockMovement.create({
      data: {
        inventoryItemId,
        type: StockMovementType.IN,
        quantity,
        orderId,
        organizationId,
        performedBy,
      } as Prisma.StockMovementUncheckedCreateInput & { performedBy: string },
    }),
  ]);

  return updated;
}
```

**Important note on `StockMovement.performedBy`:** The `StockMovement` model in the schema does not have a `performedBy` field — only `type`, `quantity`, `reason`, `orderId`, `inventoryItemId`, `organizationId`, `createdAt`. The `performedBy` value should be stored in `reason` field for stock movements, or the schema needs a `performedBy` field added. Use `reason` to store a combined string like `"Adjusted by ${performedBy}: ${reason}"` until the schema is updated. Remove the `performedBy` from the `data` object and fold it into `reason`.

**Corrected stock movement create pattern:**
```typescript
tx.stockMovement.create({
  data: {
    inventoryItemId,
    type: StockMovementType.RESERVED,
    quantity,
    reason: reason ? `${performedBy}: ${reason}` : performedBy,
    orderId,
    organizationId,
  },
}),
```

Apply this pattern to ALL stock movement creates in the file.

- [ ] **Step 2: Verify typecheck**

```bash
cd backend && npm run typecheck
```

Expected: zero errors.

---

## Task 4: Order Service

**Files:**
- Create: `backend/src/services/orderService.ts`

- [ ] **Step 1: Create `backend/src/services/orderService.ts`**

```typescript
import { Prisma, Order, OrderStatus, OrderItem, StockMovementType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { AppError } from '../middleware/errorHandler';
import { generateOrderNumber } from '../utils/generators';
import { unreserveMaterials } from './inventoryService';
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

  logger.info('Order created', { orderId: order.id, orderNumber, organizationId });
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

    // When order is cancelled, unreserve all materials
    if (newStatus === 'CANCELLED') {
      const reservedMaterials = await tx.inventoryItem.findMany({
        where: {
          organizationId,
          stockMovements: {
            some: { orderId, type: 'RESERVED' },
          },
        },
        select: { id: true, quantityReserved: true },
      });

      for (const item of reservedMaterials) {
        if (item.quantityReserved > 0) {
          await tx.inventoryItem.update({
            where: { id: item.id },
            data: { quantityReserved: { decrement: item.quantityReserved } },
          });
          await tx.stockMovement.create({
            data: {
              inventoryItemId: item.id,
              type: StockMovementType.UNRESERVED,
              quantity: item.quantityReserved,
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

// ─── Material Usage ───────────────────────────────────────────────────────────

export async function useMaterials(input: UseMaterialsInput): Promise<void> {
  const { organizationId, orderId, materials, performedBy } = input;

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

      if (item.quantityOnHand < mat.quantityUsed) {
        throw new AppError(
          400,
          `Insufficient stock for "${item.name}". On hand: ${item.quantityOnHand}, needed: ${mat.quantityUsed}`,
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
```

- [ ] **Step 2: Verify typecheck**

```bash
cd backend && npm run typecheck
```

Expected: zero errors. If there are type errors on `StockMovementUncheckedCreateInput` — the `performedBy` field doesn't exist on the model. The `reason` field approach described in Task 3 should already be applied. Double-check that all `stockMovement.create` calls use `reason` to store performer info, not a non-existent `performedBy` field.

---

## Task 5: Purchase Order Service

**Files:**
- Create: `backend/src/services/purchaseOrderService.ts`

- [ ] **Step 1: Create `backend/src/services/purchaseOrderService.ts`**

```typescript
import { Prisma, PurchaseOrder } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { AppError } from '../middleware/errorHandler';
import { generatePONumber } from '../utils/generators';
import { receiveStock } from './inventoryService';
import type { CreatePOInput, ReceivePOInput } from '../types/services';

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createPOForOrder(input: CreatePOInput): Promise<PurchaseOrder & {
  items: { id: string; description: string; quantity: number; unitCost: number; lineTotal: number }[];
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
  const total = subtotal; // Tax on POs handled separately if needed

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

    // If linked to an order, update the order status to MATERIALS_ORDERED
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

        updatedInventory.push({
          inventoryItemId,
          quantityAdded: item.quantityReceived,
        });
      }
    }

    // Determine new PO status: check if all items are fully received
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

  logger.info('PO items received', {
    poId: purchaseOrderId,
    receivingId: result.id,
    itemCount: items.length,
  });

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

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd backend && npm run typecheck
```

Expected: zero errors.

---

## Self-Review

| Spec requirement | Task |
|---|---|
| `generateSKU()` | Task 1 |
| `generateShipmentNumber()` | Task 1 |
| `generateCustomerNumber()` | Task 1 |
| `createOrder()` with items + auto required materials | Task 4 |
| `updateOrderStatus()` with history | Task 4 |
| `getOrders()` with filters | Task 4 |
| `getOrderById()` full relations | Task 4 |
| `useMaterials()` deduct inventory + track | Task 4 |
| `getOrderWorkflow()` | Task 4 |
| `createPOForOrder()` linked to customer order | Task 5 |
| `receivePOItems()` + auto inventory update | Task 5 |
| `getPOsByOrder()` | Task 5 |
| Auto-update order status on materials received | Task 5 (`receivePOItems`) |
| `reserveMaterials()` + `unreserveMaterials()` | Task 3 |
| Auto-unreserve on order cancel | Task 4 (`updateOrderStatus`) |
| Low stock alerts (`getLowStockItems`) | Task 3 |
| Track all stock movements | Task 3 + 4 |
| `env.ts`, `database.ts`, `auth.ts`, `errorHandler.ts` | **Skipped** — already built |
| JWT/bcryptjs auth | **Skipped** — Clerk handles auth |
