# Controllers, Routes, and App Entry Point Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all HTTP controllers, route files, Zod request schemas, and wire them into a complete Express app with Socket.IO real-time events.

**Architecture:** Controllers are thin — they parse/validate requests, call existing services, emit Socket.IO events where needed, and return JSON. All business logic lives in the service layer already built. The `authController` does NOT use JWT/bcrypt — it uses Clerk to sync the current user's profile into the database. Routes apply `requireAuth → injectTenant` middleware before controllers. `app.ts` replaces the current `index.ts` as the Express configuration hub; `index.ts` becomes the server bootstrap only.

**Tech Stack:** Express 5, Clerk (`@clerk/express`), Zod, Prisma 5, Socket.IO, Winston, TypeScript strict.

---

## What Already Exists (DO NOT recreate)

- `backend/src/config/env.ts` — env validation
- `backend/src/lib/prisma.ts` — Prisma singleton
- `backend/src/lib/logger.ts` — Winston logger
- `backend/src/middleware/auth.ts` — `clerkAuth`, `requireAuth`, `requireRole`
- `backend/src/middleware/errorHandler.ts` — `AppError`, `errorHandler`
- `backend/src/middleware/validate.ts` — `validate(schema, part)`
- `backend/src/middleware/tenant.ts` — `injectTenant`
- `backend/src/middleware/limits.ts` — `checkLimit`
- `backend/src/routes/health.ts` — `/health` route
- `backend/src/services/inventoryService.ts` — `getInventoryItems`, `getLowStockItems`, `adjustStock`, `reserveMaterials`, `unreserveMaterials`, `receiveStock`, `getAvailableQuantity`
- `backend/src/services/orderService.ts` — `createOrder`, `updateOrderStatus`, `getOrders`, `getOrderById`, `useMaterials`, `getOrderWorkflow`
- `backend/src/services/purchaseOrderService.ts` — `createPOForOrder`, `receivePOItems`, `getPOsByOrder`, `getPurchaseOrders`
- `backend/src/types/index.ts` — `AuthenticatedRequest`, `ApiResponse`
- `backend/src/types/services.ts` — all service input/output types
- `backend/src/index.ts` — current entry point (will be refactored in Task 10)

## File Map

### Create
- `backend/src/schemas/orderSchemas.ts` — Zod schemas for order request validation
- `backend/src/schemas/customerSchemas.ts` — Zod schemas for customer requests
- `backend/src/schemas/inventorySchemas.ts` — Zod schemas for inventory requests
- `backend/src/schemas/purchaseOrderSchemas.ts` — Zod schemas for PO requests
- `backend/src/schemas/vendorSchemas.ts` — Zod schemas for vendor requests
- `backend/src/schemas/shipmentSchemas.ts` — Zod schemas for shipment requests
- `backend/src/controllers/userController.ts` — Clerk user sync (replaces authController with JWT)
- `backend/src/controllers/orderController.ts` — Order CRUD + workflow
- `backend/src/controllers/customerController.ts` — Customer CRUD + search + order history
- `backend/src/controllers/inventoryController.ts` — Inventory CRUD + stock ops
- `backend/src/controllers/purchaseOrderController.ts` — PO lifecycle
- `backend/src/controllers/vendorController.ts` — Vendor CRUD
- `backend/src/controllers/shipmentController.ts` — Shipment creation + tracking
- `backend/src/controllers/dashboardController.ts` — Aggregated stats
- `backend/src/routes/users.ts` — `GET/PATCH /api/users/me`
- `backend/src/routes/orders.ts` — Full order routes
- `backend/src/routes/customers.ts` — Customer routes
- `backend/src/routes/inventory.ts` — Inventory routes
- `backend/src/routes/purchaseOrders.ts` — PO routes
- `backend/src/routes/vendors.ts` — Vendor routes
- `backend/src/routes/shipments.ts` — Shipment routes
- `backend/src/routes/dashboard.ts` — Dashboard routes
- `backend/src/app.ts` — Express app factory (middleware + routes, no listen())

### Modify
- `backend/src/index.ts` — Slim to: import app, create httpServer, attach Socket.IO, call httpServer.listen()

---

## Important Architecture Notes

### Auth — NO JWT, NO bcrypt
The prompt requests `authController` with `register()`, `login()`, and `getMe()`. **Override:** Clerk handles registration, login, password reset, and MFA entirely in the frontend. The backend never issues tokens. Instead:
- **`userController.ts`** has `syncMe()` (called on first login to upsert the user record in our DB) and `getMe()` (returns user profile from our DB)
- No `register()`, no `login()`, no password hashing

### Controller → Service Pattern
Controllers never query Prisma directly — they call service functions. Services already exist for orders, inventory, and POs. Controllers for vendors, customers, shipments, and dashboard query Prisma directly (no dedicated service file needed for simple CRUD).

### organizationId Source
After `requireAuth → injectTenant`, every request has:
- `req.organizationId` — Clerk org ID (string)
- `req.organizationDbId` — Prisma UUID (string)

Controllers use `req.organizationDbId` for all Prisma queries and `req.auth.userId` for `performedBy` fields.

### Socket.IO Events
The `io` instance exported from `index.ts` is used in controllers to emit real-time events. Import it where needed. Events are always namespaced to the org: `io.to(`org:${req.organizationId}`).emit(...)`.

Events emitted:
- `order:created` — after createOrder
- `order:status-changed` — after updateOrderStatus
- `order:materials-used` — after useMaterials
- `inventory:adjusted` — after adjustStock
- `inventory:low-stock` — when getLowStockItems returns items (background check)
- `po:received` — after receivePOItems
- `shipment:updated` — after shipment status change

---

## Task 1: Zod Request Schemas

**Files:**
- Create: `backend/src/schemas/orderSchemas.ts`
- Create: `backend/src/schemas/customerSchemas.ts`
- Create: `backend/src/schemas/inventorySchemas.ts`
- Create: `backend/src/schemas/purchaseOrderSchemas.ts`
- Create: `backend/src/schemas/vendorSchemas.ts`
- Create: `backend/src/schemas/shipmentSchemas.ts`

- [ ] **Step 1: Create `backend/src/schemas/orderSchemas.ts`**

```typescript
import { z } from 'zod';
import { OrderStatus, OrderPriority, PrintMethod, PrintLocation } from '@prisma/client';

export const requiredMaterialSchema = z.object({
  inventoryItemId: z.string().cuid().optional(),
  description: z.string().min(1).max(500),
  quantityRequired: z.number().positive(),
  quantityUnit: z.string().max(50).optional(),
});

export const orderItemSchema = z.object({
  productType: z.string().min(1).max(200),
  size: z.string().max(50).optional(),
  color: z.string().max(100).optional(),
  sleeveType: z.string().max(50).optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  printMethod: z.nativeEnum(PrintMethod).optional(),
  printLocations: z.array(z.nativeEnum(PrintLocation)).optional(),
  description: z.string().max(1000).optional(),
  requiredMaterials: z.array(requiredMaterialSchema).optional(),
});

export const createOrderSchema = z.object({
  customerId: z.string().cuid(),
  priority: z.nativeEnum(OrderPriority).optional(),
  dueDate: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  notes: z.string().max(2000).optional(),
  internalNotes: z.string().max(2000).optional(),
  designNotes: z.string().max(2000).optional(),
  designFiles: z.array(z.string().url()).optional(),
  items: z.array(orderItemSchema).min(1, 'Order must have at least one item'),
});

export const updateOrderSchema = z.object({
  priority: z.nativeEnum(OrderPriority).optional(),
  dueDate: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  notes: z.string().max(2000).optional(),
  internalNotes: z.string().max(2000).optional(),
  designNotes: z.string().max(2000).optional(),
  designFiles: z.array(z.string().url()).optional(),
});

export const updateStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  notes: z.string().max(2000).optional(),
});

export const useMaterialsSchema = z.object({
  materials: z.array(z.object({
    inventoryItemId: z.string().cuid(),
    quantityUsed: z.number().positive(),
    quantityUnit: z.string().max(50).optional(),
    notes: z.string().max(500).optional(),
  })).min(1),
});

export const listOrdersSchema = z.object({
  status: z.union([z.nativeEnum(OrderStatus), z.array(z.nativeEnum(OrderStatus))]).optional(),
  customerId: z.string().cuid().optional(),
  priority: z.nativeEnum(OrderPriority).optional(),
  search: z.string().max(200).optional(),
  dateFrom: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  dateTo: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
```

- [ ] **Step 2: Create `backend/src/schemas/customerSchemas.ts`**

```typescript
import { z } from 'zod';

const addressSchema = z.object({
  street: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zip: z.string().max(20).optional(),
  country: z.string().length(2).optional(),
});

export const createCustomerSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal('')).transform(v => v || undefined),
  phone: z.string().max(30).optional(),
  company: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  billing: addressSchema.optional(),
  shipping: addressSchema.optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const listCustomersSchema = z.object({
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
```

- [ ] **Step 3: Create `backend/src/schemas/inventorySchemas.ts`**

```typescript
import { z } from 'zod';
import { InventoryCategory, StockMovementType } from '@prisma/client';

export const createInventorySchema = z.object({
  name: z.string().min(1).max(300),
  category: z.nativeEnum(InventoryCategory),
  sku: z.string().min(1).max(100).optional(),
  brand: z.string().max(200).optional(),
  size: z.string().max(50).optional(),
  color: z.string().max(100).optional(),
  quantityOnHand: z.number().int().nonnegative().optional(),
  reorderPoint: z.number().int().nonnegative().optional(),
  reorderQuantity: z.number().int().positive().optional(),
  costPrice: z.number().nonnegative(),
  notes: z.string().max(2000).optional(),
});

export const updateInventorySchema = createInventorySchema.partial().omit({ category: true, sku: true }).extend({
  isActive: z.boolean().optional(),
});

export const adjustStockSchema = z.object({
  quantityDelta: z.number().int().refine(n => n !== 0, 'Delta cannot be zero'),
  type: z.nativeEnum(StockMovementType),
  reason: z.string().max(500).optional(),
  orderId: z.string().cuid().optional(),
});

export const listInventorySchema = z.object({
  category: z.nativeEnum(InventoryCategory).optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});
```

- [ ] **Step 4: Create `backend/src/schemas/purchaseOrderSchemas.ts`**

```typescript
import { z } from 'zod';

const poItemSchema = z.object({
  inventoryItemId: z.string().cuid().optional(),
  description: z.string().min(1).max(500),
  quantity: z.number().int().positive(),
  unitCost: z.number().nonnegative(),
});

export const createPOSchema = z.object({
  vendorId: z.string().cuid(),
  linkedOrderId: z.string().cuid().optional(),
  notes: z.string().max(2000).optional(),
  expectedDate: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  items: z.array(poItemSchema).min(1, 'PO must have at least one item'),
});

const receiveItemSchema = z.object({
  purchaseOrderItemId: z.string().cuid(),
  inventoryItemId: z.string().cuid().optional(),
  quantityReceived: z.number().int().positive(),
  notes: z.string().max(500).optional(),
  isAccepted: z.boolean().optional(),
});

export const receiveItemsSchema = z.object({
  notes: z.string().max(2000).optional(),
  items: z.array(receiveItemSchema).min(1),
});

export const updatePOStatusSchema = z.object({
  status: z.enum(['SENT', 'CANCELLED']),
  notes: z.string().max(2000).optional(),
});

export const listPOSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED']).optional(),
  vendorId: z.string().cuid().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
```

- [ ] **Step 5: Create `backend/src/schemas/vendorSchemas.ts`**

```typescript
import { z } from 'zod';

export const createVendorSchema = z.object({
  name: z.string().min(1).max(300),
  contactName: z.string().max(200).optional(),
  email: z.string().email().optional().or(z.literal('')).transform(v => v || undefined),
  phone: z.string().max(30).optional(),
  website: z.string().url().optional().or(z.literal('')).transform(v => v || undefined),
  notes: z.string().max(2000).optional(),
  categories: z.array(z.string()).optional(),
  paymentTerms: z.string().max(200).optional(),
  leadTimeDays: z.number().int().nonnegative().optional(),
});

export const updateVendorSchema = createVendorSchema.partial().extend({
  isActive: z.boolean().optional(),
});
```

- [ ] **Step 6: Create `backend/src/schemas/shipmentSchemas.ts`**

```typescript
import { z } from 'zod';
import { ShipmentStatus, ShipmentCarrier } from '@prisma/client';

export const createShipmentSchema = z.object({
  orderId: z.string().cuid(),
  carrier: z.nativeEnum(ShipmentCarrier).optional(),
  trackingNumber: z.string().max(200).optional(),
  shippingStreet: z.string().max(200).optional(),
  shippingCity: z.string().max(100).optional(),
  shippingState: z.string().max(100).optional(),
  shippingZip: z.string().max(20).optional(),
  shippingCountry: z.string().length(2).optional(),
  shippingCost: z.number().nonnegative().optional(),
  estimatedDelivery: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  notes: z.string().max(2000).optional(),
});

export const updateShipmentStatusSchema = z.object({
  status: z.nativeEnum(ShipmentStatus),
  notes: z.string().max(2000).optional(),
  location: z.string().max(200).optional(),
});

export const updateTrackingSchema = z.object({
  trackingNumber: z.string().min(1).max(200),
  carrier: z.nativeEnum(ShipmentCarrier),
  estimatedDelivery: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
});
```

- [ ] **Step 7: Run typecheck to verify all schemas compile**

```bash
cd i:/openroutervine/touchscreenpos/backend && npm run typecheck
```

Expected: zero errors.

- [ ] **Step 8: Commit**

```bash
cd i:/openroutervine/touchscreenpos
git add backend/src/schemas/
git commit -m "feat: add Zod request validation schemas for all resources"
```

---

## Task 2: User Controller (replaces authController)

**Files:**
- Create: `backend/src/controllers/userController.ts`

The prompt asks for `authController` with `register/login/getMe`. Per CLAUDE.md, Clerk handles auth. We implement `syncMe` (upserts user in our DB on first login) and `getMe` (returns profile).

- [ ] **Step 1: Create `backend/src/controllers/userController.ts`**

```typescript
import { Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { clerkClient } from '@clerk/express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../lib/logger';
import { AuthenticatedRequest } from '../types';

/**
 * GET /api/users/me
 * Returns the current user's profile from our database.
 * If the user doesn't exist yet (first login), syncs from Clerk and creates the record.
 */
export async function getMe(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId, orgId } = req.auth;

    // Try to find existing user record
    let user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: {
        id: true,
        clerkUserId: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        organizationId: true,
        createdAt: true,
      },
    });

    if (!user) {
      // First login — sync from Clerk
      const clerkUser = await clerkClient().users.getUser(userId);

      const org = await prisma.organization.findUnique({
        where: { clerkOrgId: orgId },
        select: { id: true },
      });

      if (!org) {
        return next(new AppError(404, 'Organization not found', 'ORG_NOT_FOUND'));
      }

      const email = clerkUser.emailAddresses[0]?.emailAddress ?? '';

      user = await prisma.user.upsert({
        where: { clerkUserId: userId },
        create: {
          clerkUserId: userId,
          email,
          firstName: clerkUser.firstName ?? '',
          lastName: clerkUser.lastName ?? '',
          avatarUrl: clerkUser.imageUrl ?? null,
          role: 'STAFF',
          isActive: true,
          organizationId: org.id,
        },
        update: {
          email,
          firstName: clerkUser.firstName ?? '',
          lastName: clerkUser.lastName ?? '',
          avatarUrl: clerkUser.imageUrl ?? null,
        },
        select: {
          id: true,
          clerkUserId: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          role: true,
          isActive: true,
          organizationId: true,
          createdAt: true,
        },
      });

      logger.info('User synced from Clerk', { userId, orgId });
    }

    res.json({ data: user });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/users/me
 * Updates the current user's profile fields that are managed in our DB (not Clerk).
 */
export async function updateMe(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req.auth;
    const { firstName, lastName } = req.body as { firstName?: string; lastName?: string };

    const user = await prisma.user.update({
      where: { clerkUserId: userId },
      data: {
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
      },
    });

    res.json({ data: user });
  } catch (error) {
    next(error);
  }
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd i:/openroutervine/touchscreenpos/backend && npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd i:/openroutervine/touchscreenpos
git add backend/src/controllers/userController.ts
git commit -m "feat: add userController with Clerk user sync (replaces JWT authController)"
```

---

## Task 3: Order Controller

**Files:**
- Create: `backend/src/controllers/orderController.ts`

- [ ] **Step 1: Create `backend/src/controllers/orderController.ts`**

```typescript
import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../lib/logger';
import {
  createOrder,
  updateOrderStatus,
  getOrders,
  getOrderById,
  useMaterials,
  getOrderWorkflow,
} from '../services/orderService';
import { AuthenticatedRequest } from '../types';
import { io } from '../index';

export async function create(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const orgDbId = req.organizationDbId!;
    const orgClerkId = req.organizationId!;

    // Look up org to get order number prefix
    const org = await prisma.organization.findUnique({
      where: { id: orgDbId },
      select: { orderNumberPrefix: true },
    });

    const order = await createOrder({
      organizationId: orgDbId,
      customerId: req.body.customerId,
      orderNumberPrefix: org?.orderNumberPrefix ?? 'ORD',
      priority: req.body.priority,
      dueDate: req.body.dueDate,
      notes: req.body.notes,
      internalNotes: req.body.internalNotes,
      designNotes: req.body.designNotes,
      designFiles: req.body.designFiles,
      items: req.body.items,
      performedBy: req.auth.userId,
    });

    io.to(`org:${orgClerkId}`).emit('order:created', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
    });

    res.status(201).json({ data: order });
  } catch (error) {
    next(error);
  }
}

export async function getAll(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await getOrders({
      organizationId: req.organizationDbId!,
      status: req.query['status'] as never,
      customerId: req.query['customerId'] as string | undefined,
      priority: req.query['priority'] as never,
      search: req.query['search'] as string | undefined,
      dateFrom: req.query['dateFrom'] as never,
      dateTo: req.query['dateTo'] as never,
      page: req.query['page'] as never,
      limit: req.query['limit'] as never,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const order = await getOrderById(req.organizationDbId!, req.params['id']!);
    res.json({ data: order });
  } catch (error) {
    next(error);
  }
}

export async function update(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const orgDbId = req.organizationDbId!;
    const orderId = req.params['id']!;

    // Verify order belongs to org before update
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, organizationId: true },
    });

    if (!existing || existing.organizationId !== orgDbId) {
      return next(new AppError(404, 'Order not found', 'ORDER_NOT_FOUND'));
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        priority: req.body.priority,
        dueDate: req.body.dueDate,
        notes: req.body.notes,
        internalNotes: req.body.internalNotes,
        designNotes: req.body.designNotes,
        designFiles: req.body.designFiles,
      },
    });

    res.json({ data: order });
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const orgClerkId = req.organizationId!;

    const order = await updateOrderStatus({
      organizationId: req.organizationDbId!,
      orderId: req.params['id']!,
      newStatus: req.body.status,
      notes: req.body.notes,
      performedBy: req.auth.userId,
    });

    io.to(`org:${orgClerkId}`).emit('order:status-changed', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
    });

    res.json({ data: order });
  } catch (error) {
    next(error);
  }
}

export async function useMaterialsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const orgClerkId = req.organizationId!;

    await useMaterials({
      organizationId: req.organizationDbId!,
      orderId: req.params['id']!,
      materials: req.body.materials,
      performedBy: req.auth.userId,
    });

    io.to(`org:${orgClerkId}`).emit('order:materials-used', {
      orderId: req.params['id'],
    });

    res.json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
}

export async function getWorkflowStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params['id'] },
      select: { id: true, organizationId: true, status: true },
    });

    if (!order || order.organizationId !== req.organizationDbId!) {
      return next(new AppError(404, 'Order not found', 'ORDER_NOT_FOUND'));
    }

    const workflow = getOrderWorkflow(order.status);
    res.json({ data: workflow });
  } catch (error) {
    next(error);
  }
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd i:/openroutervine/touchscreenpos/backend && npm run typecheck
```

Expected: zero errors. If `io` import from `../index` causes a circular dependency type error, we'll fix it in Task 10 by moving `io` to a separate `backend/src/lib/socket.ts` module.

- [ ] **Step 3: Commit**

```bash
cd i:/openroutervine/touchscreenpos
git add backend/src/controllers/orderController.ts
git commit -m "feat: add orderController"
```

---

## Task 4: Customer Controller

**Files:**
- Create: `backend/src/controllers/customerController.ts`

- [ ] **Step 1: Create `backend/src/controllers/customerController.ts`**

```typescript
import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { generateCustomerNumber } from '../utils/generators';

export async function create(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const orgDbId = req.organizationDbId!;
    const body = req.body as {
      firstName: string; lastName: string; email?: string; phone?: string;
      company?: string; notes?: string;
      billing?: { street?: string; city?: string; state?: string; zip?: string; country?: string };
      shipping?: { street?: string; city?: string; state?: string; zip?: string; country?: string };
    };

    const customerNumber = await generateCustomerNumber(orgDbId);

    const customer = await prisma.customer.create({
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        company: body.company,
        notes: body.notes,
        billingStreet: body.billing?.street,
        billingCity: body.billing?.city,
        billingState: body.billing?.state,
        billingZip: body.billing?.zip,
        billingCountry: body.billing?.country ?? 'US',
        shippingStreet: body.shipping?.street,
        shippingCity: body.shipping?.city,
        shippingState: body.shipping?.state,
        shippingZip: body.shipping?.zip,
        shippingCountry: body.shipping?.country ?? 'US',
        organizationId: orgDbId,
      },
    });

    res.status(201).json({ data: { ...customer, customerNumber } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return next(new AppError(409, 'A customer with this email already exists', 'DUPLICATE_EMAIL'));
    }
    next(error);
  }
}

export async function getAll(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const orgDbId = req.organizationDbId!;
    const search = req.query['search'] as string | undefined;
    const page = Math.max(1, Number(req.query['page'] ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query['limit'] ?? 25)));
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {
      organizationId: orgDbId,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { company: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await prisma.$transaction([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastName: 'asc' },
        include: { _count: { select: { orders: true } } },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
}

export async function getById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params['id'] },
      include: { _count: { select: { orders: true } } },
    });

    if (!customer || customer.organizationId !== req.organizationDbId!) {
      return next(new AppError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND'));
    }

    res.json({ data: customer });
  } catch (error) {
    next(error);
  }
}

export async function update(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const existing = await prisma.customer.findUnique({
      where: { id: req.params['id'] },
      select: { id: true, organizationId: true },
    });

    if (!existing || existing.organizationId !== req.organizationDbId!) {
      return next(new AppError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND'));
    }

    const body = req.body as {
      firstName?: string; lastName?: string; email?: string; phone?: string;
      company?: string; notes?: string;
      billing?: { street?: string; city?: string; state?: string; zip?: string; country?: string };
      shipping?: { street?: string; city?: string; state?: string; zip?: string; country?: string };
    };

    const customer = await prisma.customer.update({
      where: { id: req.params['id'] },
      data: {
        ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
        ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.company !== undefined ? { company: body.company } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        ...(body.billing
          ? {
              billingStreet: body.billing.street,
              billingCity: body.billing.city,
              billingState: body.billing.state,
              billingZip: body.billing.zip,
              billingCountry: body.billing.country,
            }
          : {}),
        ...(body.shipping
          ? {
              shippingStreet: body.shipping.street,
              shippingCity: body.shipping.city,
              shippingState: body.shipping.state,
              shippingZip: body.shipping.zip,
              shippingCountry: body.shipping.country,
            }
          : {}),
      },
    });

    res.json({ data: customer });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return next(new AppError(409, 'A customer with this email already exists', 'DUPLICATE_EMAIL'));
    }
    next(error);
  }
}

export async function remove(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const existing = await prisma.customer.findUnique({
      where: { id: req.params['id'] },
      select: { id: true, organizationId: true, _count: { select: { orders: true } } },
    });

    if (!existing || existing.organizationId !== req.organizationDbId!) {
      return next(new AppError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND'));
    }

    if (existing._count.orders > 0) {
      return next(new AppError(409, 'Cannot delete customer with existing orders', 'HAS_ORDERS'));
    }

    await prisma.customer.delete({ where: { id: req.params['id'] } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function getOrderHistory(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params['id'] },
      select: { id: true, organizationId: true },
    });

    if (!customer || customer.organizationId !== req.organizationDbId!) {
      return next(new AppError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND'));
    }

    const page = Math.max(1, Number(req.query['page'] ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query['limit'] ?? 25)));
    const skip = (page - 1) * limit;

    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where: { customerId: req.params['id'], organizationId: req.organizationDbId! },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, orderNumber: true, status: true, priority: true,
          subtotal: true, total: true, dueDate: true, createdAt: true,
          _count: { select: { items: true } },
        },
      }),
      prisma.order.count({
        where: { customerId: req.params['id'], organizationId: req.organizationDbId! },
      }),
    ]);

    res.json({ data: orders, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd i:/openroutervine/touchscreenpos/backend && npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd i:/openroutervine/touchscreenpos
git add backend/src/controllers/customerController.ts
git commit -m "feat: add customerController with CRUD, search, and order history"
```

---

## Task 5: Inventory Controller

**Files:**
- Create: `backend/src/controllers/inventoryController.ts`

- [ ] **Step 1: Create `backend/src/controllers/inventoryController.ts`**

```typescript
import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../lib/logger';
import { AuthenticatedRequest } from '../types';
import { generateSKU } from '../utils/generators';
import {
  getInventoryItems,
  getLowStockItems,
  adjustStock,
  getAvailableQuantity,
} from '../services/inventoryService';
import { io } from '../index';

export async function create(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const orgDbId = req.organizationDbId!;
    const body = req.body as {
      name: string; category: import('@prisma/client').InventoryCategory;
      sku?: string; brand?: string; size?: string; color?: string;
      quantityOnHand?: number; reorderPoint?: number; reorderQuantity?: number;
      costPrice: number; notes?: string;
    };

    const sku = body.sku ?? generateSKU(body.category);

    const item = await prisma.inventoryItem.create({
      data: {
        sku,
        name: body.name,
        category: body.category,
        brand: body.brand,
        size: body.size,
        color: body.color,
        quantityOnHand: body.quantityOnHand ?? 0,
        reorderPoint: body.reorderPoint ?? 10,
        reorderQuantity: body.reorderQuantity ?? 50,
        costPrice: body.costPrice,
        notes: body.notes,
        organizationId: orgDbId,
      },
    });

    res.status(201).json({ data: item });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return next(new AppError(409, 'An inventory item with this SKU already exists', 'DUPLICATE_SKU'));
    }
    next(error);
  }
}

export async function getAll(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await getInventoryItems(req.organizationDbId!, {
      category: req.query['category'] as never,
      search: req.query['search'] as string | undefined,
      page: req.query['page'] ? Number(req.query['page']) : undefined,
      limit: req.query['limit'] ? Number(req.query['limit']) : undefined,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: req.params['id'] },
    });

    if (!item || item.organizationId !== req.organizationDbId!) {
      return next(new AppError(404, 'Inventory item not found', 'INVENTORY_NOT_FOUND'));
    }

    res.json({
      data: {
        ...item,
        quantityAvailable: getAvailableQuantity(item),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function update(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const existing = await prisma.inventoryItem.findUnique({
      where: { id: req.params['id'] },
      select: { id: true, organizationId: true },
    });

    if (!existing || existing.organizationId !== req.organizationDbId!) {
      return next(new AppError(404, 'Inventory item not found', 'INVENTORY_NOT_FOUND'));
    }

    const body = req.body as {
      name?: string; brand?: string; size?: string; color?: string;
      reorderPoint?: number; reorderQuantity?: number; costPrice?: number;
      notes?: string; isActive?: boolean;
    };

    const item = await prisma.inventoryItem.update({
      where: { id: req.params['id'] },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.brand !== undefined ? { brand: body.brand } : {}),
        ...(body.size !== undefined ? { size: body.size } : {}),
        ...(body.color !== undefined ? { color: body.color } : {}),
        ...(body.reorderPoint !== undefined ? { reorderPoint: body.reorderPoint } : {}),
        ...(body.reorderQuantity !== undefined ? { reorderQuantity: body.reorderQuantity } : {}),
        ...(body.costPrice !== undefined ? { costPrice: body.costPrice } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });

    res.json({ data: item });
  } catch (error) {
    next(error);
  }
}

export async function remove(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const existing = await prisma.inventoryItem.findUnique({
      where: { id: req.params['id'] },
      select: { id: true, organizationId: true, quantityReserved: true },
    });

    if (!existing || existing.organizationId !== req.organizationDbId!) {
      return next(new AppError(404, 'Inventory item not found', 'INVENTORY_NOT_FOUND'));
    }

    if (existing.quantityReserved > 0) {
      return next(new AppError(409, 'Cannot delete item with reserved stock', 'HAS_RESERVED_STOCK'));
    }

    // Soft delete
    await prisma.inventoryItem.update({
      where: { id: req.params['id'] },
      data: { isActive: false },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function adjustStockHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const orgClerkId = req.organizationId!;

    const item = await adjustStock({
      organizationId: req.organizationDbId!,
      inventoryItemId: req.params['id']!,
      quantityDelta: req.body.quantityDelta,
      type: req.body.type,
      reason: req.body.reason,
      orderId: req.body.orderId,
      performedBy: req.auth.userId,
    });

    io.to(`org:${orgClerkId}`).emit('inventory:adjusted', {
      inventoryItemId: item.id,
      sku: item.sku,
      quantityOnHand: item.quantityOnHand,
    });

    res.json({ data: item });
  } catch (error) {
    next(error);
  }
}

export async function getLowStock(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const items = await getLowStockItems({
      organizationId: req.organizationDbId!,
      category: req.query['category'] as never,
    });

    res.json({ data: items });
  } catch (error) {
    next(error);
  }
}

export async function getStockMovements(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: req.params['id'] },
      select: { id: true, organizationId: true },
    });

    if (!item || item.organizationId !== req.organizationDbId!) {
      return next(new AppError(404, 'Inventory item not found', 'INVENTORY_NOT_FOUND'));
    }

    const page = Math.max(1, Number(req.query['page'] ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query['limit'] ?? 50)));
    const skip = (page - 1) * limit;

    const [movements, total] = await prisma.$transaction([
      prisma.stockMovement.findMany({
        where: { inventoryItemId: req.params['id'], organizationId: req.organizationDbId! },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.stockMovement.count({
        where: { inventoryItemId: req.params['id'], organizationId: req.organizationDbId! },
      }),
    ]);

    res.json({ data: movements, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd i:/openroutervine/touchscreenpos/backend && npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd i:/openroutervine/touchscreenpos
git add backend/src/controllers/inventoryController.ts
git commit -m "feat: add inventoryController with CRUD, adjustStock, lowStock, movements"
```

---

## Task 6: Purchase Order Controller

**Files:**
- Create: `backend/src/controllers/purchaseOrderController.ts`

- [ ] **Step 1: Create `backend/src/controllers/purchaseOrderController.ts`**

```typescript
import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import {
  createPOForOrder,
  receivePOItems,
  getPOsByOrder,
  getPurchaseOrders,
} from '../services/purchaseOrderService';
import { io } from '../index';

export async function create(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const po = await createPOForOrder({
      organizationId: req.organizationDbId!,
      vendorId: req.body.vendorId,
      linkedOrderId: req.body.linkedOrderId,
      notes: req.body.notes,
      expectedDate: req.body.expectedDate,
      items: req.body.items,
      performedBy: req.auth.userId,
    });

    res.status(201).json({ data: po });
  } catch (error) {
    next(error);
  }
}

// createForOrder is the same endpoint — linkedOrderId makes it JIT
export { create as createForOrder };

export async function getByOrder(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const pos = await getPOsByOrder(req.organizationDbId!, req.params['orderId']!);
    res.json({ data: pos });
  } catch (error) {
    next(error);
  }
}

export async function getAll(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await getPurchaseOrders(req.organizationDbId!, {
      status: req.query['status'] as never,
      vendorId: req.query['vendorId'] as string | undefined,
      page: req.query['page'] ? Number(req.query['page']) : undefined,
      limit: req.query['limit'] ? Number(req.query['limit']) : undefined,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: req.params['id'] },
      include: {
        vendor: true,
        items: { include: { inventoryItem: { select: { id: true, sku: true, name: true } } } },
        receivings: { include: { items: true }, orderBy: { receivedAt: 'desc' } },
      },
    });

    if (!po || po.organizationId !== req.organizationDbId!) {
      return next(new AppError(404, 'Purchase order not found', 'PO_NOT_FOUND'));
    }

    res.json({ data: po });
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: req.params['id'] },
      select: { id: true, organizationId: true, status: true },
    });

    if (!po || po.organizationId !== req.organizationDbId!) {
      return next(new AppError(404, 'Purchase order not found', 'PO_NOT_FOUND'));
    }

    // Only allow SENT or CANCELLED from DRAFT/SENT states
    const allowedTransitions: Record<string, string[]> = {
      DRAFT: ['SENT', 'CANCELLED'],
      SENT: ['CANCELLED'],
    };

    const allowed = allowedTransitions[po.status] ?? [];
    if (!allowed.includes(req.body.status)) {
      return next(
        new AppError(
          400,
          `Cannot transition PO from ${po.status} to ${req.body.status}`,
          'INVALID_PO_STATUS',
        ),
      );
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id: req.params['id'] },
      data: { status: req.body.status },
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
}

export async function receiveItems(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const orgClerkId = req.organizationId!;

    const result = await receivePOItems({
      organizationId: req.organizationDbId!,
      purchaseOrderId: req.params['id']!,
      receivedBy: req.auth.userId,
      notes: req.body.notes,
      items: req.body.items,
    });

    io.to(`org:${orgClerkId}`).emit('po:received', {
      purchaseOrderId: req.params['id'],
      updatedInventory: result.updatedInventory,
      orderStatusUpdated: result.orderStatusUpdated,
    });

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function sendToVendor(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: req.params['id'] },
      select: { id: true, organizationId: true, status: true },
    });

    if (!po || po.organizationId !== req.organizationDbId!) {
      return next(new AppError(404, 'Purchase order not found', 'PO_NOT_FOUND'));
    }

    if (po.status !== 'DRAFT') {
      return next(new AppError(400, 'Only DRAFT purchase orders can be sent', 'INVALID_PO_STATUS'));
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id: req.params['id'] },
      data: { status: 'SENT' },
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd i:/openroutervine/touchscreenpos/backend && npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd i:/openroutervine/touchscreenpos
git add backend/src/controllers/purchaseOrderController.ts
git commit -m "feat: add purchaseOrderController"
```

---

## Task 7: Vendor Controller

**Files:**
- Create: `backend/src/controllers/vendorController.ts`

- [ ] **Step 1: Create `backend/src/controllers/vendorController.ts`**

```typescript
import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';

export async function create(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as {
      name: string; contactName?: string; email?: string; phone?: string;
      website?: string; notes?: string; categories?: string[];
      paymentTerms?: string; leadTimeDays?: number;
    };

    const vendor = await prisma.vendor.create({
      data: {
        name: body.name,
        contactName: body.contactName,
        email: body.email,
        phone: body.phone,
        website: body.website,
        notes: body.notes,
        categories: body.categories ?? [],
        paymentTerms: body.paymentTerms,
        leadTimeDays: body.leadTimeDays,
        organizationId: req.organizationDbId!,
      },
    });

    res.status(201).json({ data: vendor });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return next(new AppError(409, 'A vendor with this name already exists', 'DUPLICATE_VENDOR'));
    }
    next(error);
  }
}

export async function getAll(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const search = req.query['search'] as string | undefined;
    const activeOnly = req.query['active'] !== 'false';
    const page = Math.max(1, Number(req.query['page'] ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query['limit'] ?? 25)));
    const skip = (page - 1) * limit;

    const where: Prisma.VendorWhereInput = {
      organizationId: req.organizationDbId!,
      ...(activeOnly ? { isActive: true } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { contactName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await prisma.$transaction([
      prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: { _count: { select: { purchaseOrders: true } } },
      }),
      prisma.vendor.count({ where }),
    ]);

    res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
}

export async function getById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: req.params['id'] },
      include: {
        _count: { select: { purchaseOrders: true } },
        purchaseOrders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, poNumber: true, status: true, total: true, createdAt: true },
        },
      },
    });

    if (!vendor || vendor.organizationId !== req.organizationDbId!) {
      return next(new AppError(404, 'Vendor not found', 'VENDOR_NOT_FOUND'));
    }

    res.json({ data: vendor });
  } catch (error) {
    next(error);
  }
}

export async function update(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const existing = await prisma.vendor.findUnique({
      where: { id: req.params['id'] },
      select: { id: true, organizationId: true },
    });

    if (!existing || existing.organizationId !== req.organizationDbId!) {
      return next(new AppError(404, 'Vendor not found', 'VENDOR_NOT_FOUND'));
    }

    const body = req.body as {
      name?: string; contactName?: string; email?: string; phone?: string;
      website?: string; notes?: string; categories?: string[];
      paymentTerms?: string; leadTimeDays?: number; isActive?: boolean;
    };

    const vendor = await prisma.vendor.update({
      where: { id: req.params['id'] },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.contactName !== undefined ? { contactName: body.contactName } : {}),
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.website !== undefined ? { website: body.website } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        ...(body.categories !== undefined ? { categories: body.categories } : {}),
        ...(body.paymentTerms !== undefined ? { paymentTerms: body.paymentTerms } : {}),
        ...(body.leadTimeDays !== undefined ? { leadTimeDays: body.leadTimeDays } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });

    res.json({ data: vendor });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return next(new AppError(409, 'A vendor with this name already exists', 'DUPLICATE_VENDOR'));
    }
    next(error);
  }
}

export async function remove(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const existing = await prisma.vendor.findUnique({
      where: { id: req.params['id'] },
      select: { id: true, organizationId: true, _count: { select: { purchaseOrders: true } } },
    });

    if (!existing || existing.organizationId !== req.organizationDbId!) {
      return next(new AppError(404, 'Vendor not found', 'VENDOR_NOT_FOUND'));
    }

    if (existing._count.purchaseOrders > 0) {
      // Soft delete vendors with PO history
      await prisma.vendor.update({
        where: { id: req.params['id'] },
        data: { isActive: false },
      });
    } else {
      await prisma.vendor.delete({ where: { id: req.params['id'] } });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd i:/openroutervine/touchscreenpos/backend && npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd i:/openroutervine/touchscreenpos
git add backend/src/controllers/vendorController.ts
git commit -m "feat: add vendorController with CRUD"
```

---

## Task 8: Shipment Controller

**Files:**
- Create: `backend/src/controllers/shipmentController.ts`

- [ ] **Step 1: Create `backend/src/controllers/shipmentController.ts`**

```typescript
import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { generateShipmentNumber } from '../utils/generators';
import { io } from '../index';

export async function create(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const orgDbId = req.organizationDbId!;
    const orgClerkId = req.organizationId!;
    const body = req.body as {
      orderId: string; carrier?: import('@prisma/client').ShipmentCarrier;
      trackingNumber?: string; shippingStreet?: string; shippingCity?: string;
      shippingState?: string; shippingZip?: string; shippingCountry?: string;
      shippingCost?: number; estimatedDelivery?: Date; notes?: string;
    };

    // Verify order belongs to org and is in READY_TO_SHIP status
    const order = await prisma.order.findUnique({
      where: { id: body.orderId },
      select: { id: true, organizationId: true, status: true, orderNumber: true },
    });

    if (!order || order.organizationId !== orgDbId) {
      return next(new AppError(404, 'Order not found', 'ORDER_NOT_FOUND'));
    }

    if (order.status !== 'READY_TO_SHIP') {
      return next(
        new AppError(
          400,
          `Order must be READY_TO_SHIP to create shipment. Current status: ${order.status}`,
          'INVALID_ORDER_STATUS',
        ),
      );
    }

    const shipmentNumber = await generateShipmentNumber(orgDbId);

    const shipment = await prisma.$transaction(async (tx) => {
      const created = await tx.shipment.create({
        data: {
          orderId: body.orderId,
          carrier: body.carrier ?? 'UPS',
          trackingNumber: body.trackingNumber,
          status: 'PENDING',
          shippingStreet: body.shippingStreet,
          shippingCity: body.shippingCity,
          shippingState: body.shippingState,
          shippingZip: body.shippingZip,
          shippingCountry: body.shippingCountry ?? 'US',
          shippingCost: body.shippingCost,
          estimatedDelivery: body.estimatedDelivery,
          notes: body.notes,
          organizationId: orgDbId,
        },
      });

      await tx.shipmentStatusHistory.create({
        data: {
          shipmentId: created.id,
          fromStatus: null,
          toStatus: 'PENDING',
          changedBy: req.auth.userId,
          notes: `Shipment ${shipmentNumber} created for order ${order.orderNumber}`,
          organizationId: orgDbId,
        },
      });

      // Advance order status to SHIPPED
      await tx.order.update({
        where: { id: body.orderId },
        data: { status: 'SHIPPED' },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: body.orderId,
          fromStatus: 'READY_TO_SHIP',
          toStatus: 'SHIPPED',
          changedBy: req.auth.userId,
          notes: `Shipment created`,
          organizationId: orgDbId,
        },
      });

      return created;
    });

    io.to(`org:${orgClerkId}`).emit('shipment:updated', {
      shipmentId: shipment.id,
      orderId: body.orderId,
      status: shipment.status,
    });

    res.status(201).json({ data: shipment });
  } catch (error) {
    next(error);
  }
}

export async function getAll(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query['page'] ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query['limit'] ?? 25)));
    const skip = (page - 1) * limit;

    const where = {
      organizationId: req.organizationDbId!,
      ...(req.query['status'] ? { status: req.query['status'] as never } : {}),
    };

    const [data, total] = await prisma.$transaction([
      prisma.shipment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: { select: { id: true, orderNumber: true, customer: { select: { firstName: true, lastName: true } } } },
        },
      }),
      prisma.shipment.count({ where }),
    ]);

    res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
}

export async function getById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: req.params['id'] },
      include: {
        order: { select: { id: true, orderNumber: true, status: true } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!shipment || shipment.organizationId !== req.organizationDbId!) {
      return next(new AppError(404, 'Shipment not found', 'SHIPMENT_NOT_FOUND'));
    }

    res.json({ data: shipment });
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const orgDbId = req.organizationDbId!;
    const orgClerkId = req.organizationId!;

    const shipment = await prisma.shipment.findUnique({
      where: { id: req.params['id'] },
      select: { id: true, organizationId: true, status: true, orderId: true },
    });

    if (!shipment || shipment.organizationId !== orgDbId) {
      return next(new AppError(404, 'Shipment not found', 'SHIPMENT_NOT_FOUND'));
    }

    const newStatus: import('@prisma/client').ShipmentStatus = req.body.status;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.shipment.update({
        where: { id: req.params['id'] },
        data: {
          status: newStatus,
          ...(newStatus === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
        },
      });

      await tx.shipmentStatusHistory.create({
        data: {
          shipmentId: result.id,
          fromStatus: shipment.status,
          toStatus: newStatus,
          changedBy: req.auth.userId,
          notes: req.body.notes,
          location: req.body.location,
          organizationId: orgDbId,
        },
      });

      // If delivered, advance order to DELIVERED
      if (newStatus === 'DELIVERED') {
        await tx.order.update({
          where: { id: shipment.orderId },
          data: { status: 'DELIVERED' },
        });
      }

      return result;
    });

    io.to(`org:${orgClerkId}`).emit('shipment:updated', {
      shipmentId: updated.id,
      orderId: shipment.orderId,
      status: updated.status,
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
}

export async function updateTracking(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: req.params['id'] },
      select: { id: true, organizationId: true },
    });

    if (!shipment || shipment.organizationId !== req.organizationDbId!) {
      return next(new AppError(404, 'Shipment not found', 'SHIPMENT_NOT_FOUND'));
    }

    const updated = await prisma.shipment.update({
      where: { id: req.params['id'] },
      data: {
        trackingNumber: req.body.trackingNumber,
        carrier: req.body.carrier,
        estimatedDelivery: req.body.estimatedDelivery,
      },
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd i:/openroutervine/touchscreenpos/backend && npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd i:/openroutervine/touchscreenpos
git add backend/src/controllers/shipmentController.ts
git commit -m "feat: add shipmentController with create, status, tracking"
```

---

## Task 9: Dashboard Controller

**Files:**
- Create: `backend/src/controllers/dashboardController.ts`

- [ ] **Step 1: Create `backend/src/controllers/dashboardController.ts`**

```typescript
import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../types';

export async function getStats(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const orgDbId = req.organizationDbId!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      ordersToday,
      inProduction,
      readyToShip,
      revenueToday,
      totalRevenueMonth,
      lowStockCount,
      pendingPOCount,
    ] = await Promise.all([
      prisma.order.count({
        where: {
          organizationId: orgDbId,
          createdAt: { gte: today, lt: tomorrow },
        },
      }),
      prisma.order.count({
        where: { organizationId: orgDbId, status: 'IN_PRODUCTION' },
      }),
      prisma.order.count({
        where: { organizationId: orgDbId, status: 'READY_TO_SHIP' },
      }),
      prisma.order.aggregate({
        where: {
          organizationId: orgDbId,
          createdAt: { gte: today, lt: tomorrow },
          status: { notIn: ['CANCELLED', 'QUOTE'] },
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          organizationId: orgDbId,
          createdAt: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1),
            lt: new Date(today.getFullYear(), today.getMonth() + 1, 1),
          },
          status: { notIn: ['CANCELLED', 'QUOTE'] },
        },
        _sum: { total: true },
      }),
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM inventory_items
        WHERE "organizationId" = ${orgDbId}
          AND "isActive" = true
          AND "quantityOnHand" <= "reorderPoint"
      `.then(([r]) => Number(r?.count ?? 0)),
      prisma.purchaseOrder.count({
        where: { organizationId: orgDbId, status: { in: ['DRAFT', 'SENT'] } },
      }),
    ]);

    res.json({
      data: {
        ordersToday,
        inProduction,
        readyToShip,
        revenueToday: Number(revenueToday._sum.total ?? 0),
        totalRevenueMonth: Number(totalRevenueMonth._sum.total ?? 0),
        lowStockCount,
        pendingPOCount,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getRecentOrders(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const orders = await prisma.order.findMany({
      where: { organizationId: req.organizationDbId! },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { items: true } },
      },
    });

    res.json({ data: orders });
  } catch (error) {
    next(error);
  }
}

export async function getOrdersByStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const counts = await prisma.order.groupBy({
      by: ['status'],
      where: { organizationId: req.organizationDbId! },
      _count: { id: true },
    });

    const result = counts.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count.id;
      return acc;
    }, {});

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function getLowStockAlerts(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const items = await prisma.$queryRaw<
      Array<{
        id: string; sku: string; name: string; category: string;
        quantityOnHand: number; reorderPoint: number; reorderQuantity: number;
      }>
    >`
      SELECT id, sku, name, category::text, "quantityOnHand", "reorderPoint", "reorderQuantity"
      FROM inventory_items
      WHERE "organizationId" = ${req.organizationDbId!}
        AND "isActive" = true
        AND "quantityOnHand" <= "reorderPoint"
      ORDER BY ("reorderPoint" - "quantityOnHand") DESC
      LIMIT 20
    `;

    res.json({ data: items });
  } catch (error) {
    next(error);
  }
}

export async function getPendingPOs(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const pos = await prisma.purchaseOrder.findMany({
      where: {
        organizationId: req.organizationDbId!,
        status: { in: ['DRAFT', 'SENT'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        vendor: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    });

    res.json({ data: pos });
  } catch (error) {
    next(error);
  }
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd i:/openroutervine/touchscreenpos/backend && npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd i:/openroutervine/touchscreenpos
git add backend/src/controllers/dashboardController.ts
git commit -m "feat: add dashboardController with stats, recent orders, alerts"
```

---

## Task 10: Socket.IO module + app.ts + refactor index.ts

**Files:**
- Create: `backend/src/lib/socket.ts` — Socket.IO singleton (breaks circular dependency)
- Create: `backend/src/app.ts` — Express app factory
- Modify: `backend/src/index.ts` — slim to just bootstrap

Controllers currently import `io` from `../index`. That creates a circular dependency (`index.ts` → routes → controllers → `index.ts`). Fix: extract the `io` instance into its own module `src/lib/socket.ts`.

- [ ] **Step 1: Create `backend/src/lib/socket.ts`**

```typescript
import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';

// Singleton — initialized once in index.ts, imported by controllers
let _io: SocketIOServer | null = null;

export function initSocket(httpServer: HttpServer, corsOrigins: string[]): SocketIOServer {
  _io = new SocketIOServer(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
  });
  return _io;
}

export function getIO(): SocketIOServer {
  if (!_io) {
    throw new Error('Socket.IO not initialized. Call initSocket() first.');
  }
  return _io;
}
```

- [ ] **Step 2: Update all controller imports**

In each controller that has `import { io } from '../index';`, change it to:
```typescript
import { getIO } from '../lib/socket';
```

And change all `io.to(...)` calls to `getIO().to(...)`.

Files to update:
- `backend/src/controllers/orderController.ts` — replace `import { io } from '../index'` with `import { getIO } from '../lib/socket'`, replace `io.to(` with `getIO().to(`
- `backend/src/controllers/inventoryController.ts` — same
- `backend/src/controllers/purchaseOrderController.ts` — same
- `backend/src/controllers/shipmentController.ts` — same

- [ ] **Step 3: Create `backend/src/routes/users.ts`**

```typescript
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { injectTenant } from '../middleware/tenant';
import { getMe, updateMe } from '../controllers/userController';

export const usersRouter = Router();

usersRouter.use(requireAuth, injectTenant);

usersRouter.get('/me', getMe);
usersRouter.patch('/me', updateMe);
```

- [ ] **Step 4: Create `backend/src/routes/orders.ts`**

```typescript
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { injectTenant } from '../middleware/tenant';
import { checkLimit } from '../middleware/limits';
import { validate } from '../middleware/validate';
import {
  createOrderSchema,
  updateOrderSchema,
  updateStatusSchema,
  useMaterialsSchema,
  listOrdersSchema,
} from '../schemas/orderSchemas';
import {
  create,
  getAll,
  getById,
  update,
  updateStatus,
  useMaterialsHandler,
  getWorkflowStatus,
} from '../controllers/orderController';

export const ordersRouter = Router();

ordersRouter.use(requireAuth, injectTenant);

ordersRouter.get('/', validate(listOrdersSchema, 'query'), getAll);
ordersRouter.post('/', checkLimit('orders'), validate(createOrderSchema), create);
ordersRouter.get('/:id', getById);
ordersRouter.patch('/:id', validate(updateOrderSchema), update);
ordersRouter.patch('/:id/status', validate(updateStatusSchema), updateStatus);
ordersRouter.post('/:id/use-materials', validate(useMaterialsSchema), useMaterialsHandler);
ordersRouter.get('/:id/workflow', getWorkflowStatus);
```

- [ ] **Step 5: Create `backend/src/routes/customers.ts`**

```typescript
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { injectTenant } from '../middleware/tenant';
import { checkLimit } from '../middleware/limits';
import { validate } from '../middleware/validate';
import { createCustomerSchema, updateCustomerSchema, listCustomersSchema } from '../schemas/customerSchemas';
import { create, getAll, getById, update, remove, getOrderHistory } from '../controllers/customerController';

export const customersRouter = Router();

customersRouter.use(requireAuth, injectTenant);

customersRouter.get('/', validate(listCustomersSchema, 'query'), getAll);
customersRouter.post('/', validate(createCustomerSchema), create);
customersRouter.get('/:id', getById);
customersRouter.patch('/:id', validate(updateCustomerSchema), update);
customersRouter.delete('/:id', remove);
customersRouter.get('/:id/orders', getOrderHistory);
```

- [ ] **Step 6: Create `backend/src/routes/inventory.ts`**

```typescript
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { injectTenant } from '../middleware/tenant';
import { checkLimit } from '../middleware/limits';
import { validate } from '../middleware/validate';
import {
  createInventorySchema,
  updateInventorySchema,
  adjustStockSchema,
  listInventorySchema,
} from '../schemas/inventorySchemas';
import {
  create, getAll, getById, update, remove,
  adjustStockHandler, getLowStock, getStockMovements,
} from '../controllers/inventoryController';

export const inventoryRouter = Router();

inventoryRouter.use(requireAuth, injectTenant);

inventoryRouter.get('/', validate(listInventorySchema, 'query'), getAll);
inventoryRouter.post('/', checkLimit('inventoryItems'), validate(createInventorySchema), create);
inventoryRouter.get('/low-stock', getLowStock);
inventoryRouter.get('/:id', getById);
inventoryRouter.patch('/:id', validate(updateInventorySchema), update);
inventoryRouter.delete('/:id', remove);
inventoryRouter.post('/:id/adjust', validate(adjustStockSchema), adjustStockHandler);
inventoryRouter.get('/:id/movements', getStockMovements);
```

- [ ] **Step 7: Create `backend/src/routes/purchaseOrders.ts`**

```typescript
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { injectTenant } from '../middleware/tenant';
import { validate } from '../middleware/validate';
import { createPOSchema, receiveItemsSchema, updatePOStatusSchema, listPOSchema } from '../schemas/purchaseOrderSchemas';
import {
  create, getAll, getById, updateStatus, receiveItems, sendToVendor,
} from '../controllers/purchaseOrderController';

export const purchaseOrdersRouter = Router();

purchaseOrdersRouter.use(requireAuth, injectTenant);

purchaseOrdersRouter.get('/', validate(listPOSchema, 'query'), getAll);
purchaseOrdersRouter.post('/', validate(createPOSchema), create);
purchaseOrdersRouter.get('/:id', getById);
purchaseOrdersRouter.patch('/:id/status', validate(updatePOStatusSchema), updateStatus);
purchaseOrdersRouter.post('/:id/receive', validate(receiveItemsSchema), receiveItems);
purchaseOrdersRouter.post('/:id/send', sendToVendor);
```

- [ ] **Step 8: Create `backend/src/routes/vendors.ts`**

```typescript
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { injectTenant } from '../middleware/tenant';
import { validate } from '../middleware/validate';
import { createVendorSchema, updateVendorSchema } from '../schemas/vendorSchemas';
import { create, getAll, getById, update, remove } from '../controllers/vendorController';

export const vendorsRouter = Router();

vendorsRouter.use(requireAuth, injectTenant);

vendorsRouter.get('/', getAll);
vendorsRouter.post('/', validate(createVendorSchema), create);
vendorsRouter.get('/:id', getById);
vendorsRouter.patch('/:id', validate(updateVendorSchema), update);
vendorsRouter.delete('/:id', remove);
```

- [ ] **Step 9: Create `backend/src/routes/shipments.ts`**

```typescript
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { injectTenant } from '../middleware/tenant';
import { validate } from '../middleware/validate';
import {
  createShipmentSchema,
  updateShipmentStatusSchema,
  updateTrackingSchema,
} from '../schemas/shipmentSchemas';
import { create, getAll, getById, updateStatus, updateTracking } from '../controllers/shipmentController';

export const shipmentsRouter = Router();

shipmentsRouter.use(requireAuth, injectTenant);

shipmentsRouter.get('/', getAll);
shipmentsRouter.post('/', validate(createShipmentSchema), create);
shipmentsRouter.get('/:id', getById);
shipmentsRouter.patch('/:id/status', validate(updateShipmentStatusSchema), updateStatus);
shipmentsRouter.patch('/:id/tracking', validate(updateTrackingSchema), updateTracking);
```

- [ ] **Step 10: Create `backend/src/routes/dashboard.ts`**

```typescript
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { injectTenant } from '../middleware/tenant';
import { getStats, getRecentOrders, getOrdersByStatus, getLowStockAlerts, getPendingPOs } from '../controllers/dashboardController';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth, injectTenant);

dashboardRouter.get('/stats', getStats);
dashboardRouter.get('/recent-orders', getRecentOrders);
dashboardRouter.get('/orders-by-status', getOrdersByStatus);
dashboardRouter.get('/low-stock', getLowStockAlerts);
dashboardRouter.get('/pending-pos', getPendingPOs);
```

- [ ] **Step 11: Create `backend/src/app.ts`**

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

import { env } from './config/env';
import { clerkAuth } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';

import { healthRouter } from './routes/health';
import { usersRouter } from './routes/users';
import { ordersRouter } from './routes/orders';
import { customersRouter } from './routes/customers';
import { inventoryRouter } from './routes/inventory';
import { purchaseOrdersRouter } from './routes/purchaseOrders';
import { vendorsRouter } from './routes/vendors';
import { shipmentsRouter } from './routes/shipments';
import { dashboardRouter } from './routes/dashboard';

export function createApp(): express.Application {
  const app = express();

  // ─── Security & Parsing ───────────────────────────────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGINS.split(','),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // ─── Health (no auth) ─────────────────────────────────────────────────────
  app.use('/health', healthRouter);

  // ─── Clerk auth middleware (all /api/* routes) ────────────────────────────
  app.use('/api', clerkAuth);

  // ─── API Routes ───────────────────────────────────────────────────────────
  app.use('/api/users', usersRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/customers', customersRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/purchase-orders', purchaseOrdersRouter);
  app.use('/api/vendors', vendorsRouter);
  app.use('/api/shipments', shipmentsRouter);
  app.use('/api/dashboard', dashboardRouter);

  // ─── Error Handler (must be last) ─────────────────────────────────────────
  app.use(errorHandler);

  return app;
}
```

- [ ] **Step 12: Rewrite `backend/src/index.ts`**

Replace the current contents of `backend/src/index.ts` entirely with:

```typescript
import 'dotenv/config';
import { env } from './config/env';
import { createServer } from 'http';
import { verifyToken } from '@clerk/express';

import { logger } from './lib/logger';
import { createApp } from './app';
import { initSocket } from './lib/socket';

const app = createApp();
const httpServer = createServer(app);

const io = initSocket(httpServer, env.CORS_ORIGINS.split(','));

io.on('connection', (socket) => {
  const token = socket.handshake.auth['token'] as string | undefined;

  if (!token) {
    logger.warn(`Socket ${socket.id} rejected: no token`);
    socket.disconnect(true);
    return;
  }

  verifyToken(token, { secretKey: env.CLERK_SECRET_KEY })
    .then((payload) => {
      const orgId = payload.org_id;
      if (!orgId) {
        logger.warn(`Socket ${socket.id} rejected: no org context in token`);
        socket.disconnect(true);
        return;
      }
      void socket.join(`org:${orgId}`);
      logger.debug(`Socket ${socket.id} joined org room: ${orgId}`);

      socket.on('disconnect', () => {
        logger.debug(`Socket ${socket.id} disconnected`);
      });
    })
    .catch(() => {
      logger.warn(`Socket ${socket.id} rejected: invalid token`);
      socket.disconnect(true);
    });
});

const PORT = env.PORT;

httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} (${env.NODE_ENV})`);
});
```

- [ ] **Step 13: Run typecheck**

```bash
cd i:/openroutervine/touchscreenpos/backend && npm run typecheck
```

Expected: zero errors. Fix any import path errors if encountered.

- [ ] **Step 14: Commit**

```bash
cd i:/openroutervine/touchscreenpos
git add backend/src/lib/socket.ts backend/src/app.ts backend/src/index.ts \
  backend/src/routes/ backend/src/controllers/orderController.ts \
  backend/src/controllers/inventoryController.ts \
  backend/src/controllers/purchaseOrderController.ts \
  backend/src/controllers/shipmentController.ts
git commit -m "feat: wire all routes into app.ts, extract socket.ts singleton, refactor index.ts"
```

---

## Self-Review

| Spec requirement | Task |
|---|---|
| `authController.register/login/getMe` | **Adapted** → Task 2 `userController.getMe/updateMe` (Clerk handles auth per CLAUDE.md) |
| `orderController.create/getAll/getById/update/updateStatus/useMaterials/getWorkflowStatus` | Task 3 |
| `customerController` full CRUD + search + order history | Task 4 |
| `inventoryController` full CRUD + adjustStock + getLowStock + getStockMovements | Task 5 |
| `purchaseOrderController.create/createForOrder/getByOrder/updateStatus/receiveItems/sendToVendor` | Task 6 |
| `vendorController` full CRUD | Task 7 |
| `shipmentController.create/updateStatus/updateTracking` | Task 8 |
| `dashboardController.getStats/getRecentOrders/getOrdersByStatus/getLowStockAlerts/getPendingPOs` | Task 9 |
| Routes for all controllers | Task 10 steps 3–10 |
| `app.ts` with middleware + routes + Socket.IO events | Task 10 steps 11–12 |
| Real-time events: order, inventory, PO, shipment | Tasks 3/5/6/8 + Task 10 |

**Placeholder scan:** None found — all code blocks are complete.

**Type consistency:** `AuthenticatedRequest` used consistently across all controllers. `req.organizationDbId!` (Prisma UUID) used for all Prisma queries. `req.organizationId!` (Clerk ID) used only for Socket.IO room targeting. `req.auth.userId` used for `performedBy` fields.
