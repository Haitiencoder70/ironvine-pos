# Schema Extensions + Backend Utilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing Prisma schema with missing models and enums, then add backend utility files needed for the full business workflow.

**Architecture:** All new models extend the existing multi-tenant schema — every model gets `organizationId`. Utilities follow established patterns in `src/lib/` and `src/middleware/`. No auth changes — Clerk handles everything already.

**Tech Stack:** Prisma 5, PostgreSQL 15, TypeScript strict, Zod 3, Winston (already installed).

---

## What Already Exists (DO NOT recreate)

- `backend/prisma/schema.prisma` — Organization, User, Customer, Order, OrderItem, InventoryItem, StockMovement, Vendor, PurchaseOrder, PurchaseOrderItem, Shipment
- `backend/src/index.ts` — Express app entry
- `backend/src/lib/prisma.ts` — database client
- `backend/src/lib/logger.ts` — Winston logger
- `backend/src/middleware/auth.ts` — Clerk auth
- `backend/src/middleware/tenant.ts` — org injection
- `backend/src/middleware/errorHandler.ts` — error handler + AppError
- `backend/src/types/index.ts` — shared types

## File Map

### Modify
- `backend/prisma/schema.prisma` — add missing enums + 7 new models

### Create
- `backend/src/config/env.ts` — validated env vars with startup fail-fast
- `backend/src/middleware/validate.ts` — Zod request validation middleware
- `backend/src/utils/generators.ts` — order number, PO number, invite token generators
- `backend/prisma/seed.ts` — seed a default org + admin user for local dev

---

## Task 1: Schema Extensions

**Files:**
- Modify: `backend/prisma/schema.prisma`

### What to add

**Missing enum values:**
- `OrderStatus`: add `PENDING_APPROVAL`, `ON_HOLD`
- `PrintMethod`: add `DTG`
- `StockMovementType`: replace current values with `IN, OUT, RESERVED, UNRESERVED, ADJUSTMENT, DAMAGED, RETURNED` (superset of current RECEIPT/USAGE/ADJUSTMENT/RESERVATION/RELEASE/RETURN — rename for clarity and add DAMAGED)

**New models:** `OrderStatusHistory`, `RequiredMaterial`, `MaterialUsage`, `POReceiving`, `POReceivingItem`, `ShipmentStatusHistory`, `ActivityLog`

- [ ] **Step 1: Add missing enum values to `backend/prisma/schema.prisma`**

Find and replace the `OrderStatus` enum:
```prisma
enum OrderStatus {
  QUOTE
  PENDING_APPROVAL
  APPROVED
  MATERIALS_ORDERED
  MATERIALS_RECEIVED
  IN_PRODUCTION
  QUALITY_CHECK
  READY_TO_SHIP
  SHIPPED
  DELIVERED
  COMPLETED
  CANCELLED
  ON_HOLD
}
```

Find and replace the `PrintMethod` enum:
```prisma
enum PrintMethod {
  DTF
  HTV
  SCREEN_PRINT
  EMBROIDERY
  SUBLIMATION
  DTG
}
```

Find and replace the `StockMovementType` enum:
```prisma
enum StockMovementType {
  IN
  OUT
  RESERVED
  UNRESERVED
  ADJUSTMENT
  DAMAGED
  RETURNED
}
```

- [ ] **Step 2: Add `OrderStatusHistory` model to `backend/prisma/schema.prisma`**

Add after the `Order` model:
```prisma
// ─── Order Status History ─────────────────────────────────────────────────────

model OrderStatusHistory {
  id      String      @id @default(cuid())
  orderId String
  order   Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)

  fromStatus OrderStatus?
  toStatus   OrderStatus
  changedBy  String
  notes      String?

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@index([orderId, createdAt(sort: Desc)])
  @@index([organizationId])
  @@map("order_status_history")
}
```

Also add `statusHistory OrderStatusHistory[]` to the `Order` model relations list.
Also add `orderStatusHistories OrderStatusHistory[]` to the `Organization` model relations list.

- [ ] **Step 3: Add `RequiredMaterial` model**

Add after `OrderStatusHistory`:
```prisma
// ─── Required Material ────────────────────────────────────────────────────────

model RequiredMaterial {
  id          String    @id @default(cuid())
  orderItemId String
  orderItem   OrderItem @relation(fields: [orderItemId], references: [id], onDelete: Cascade)

  inventoryItemId String?
  inventoryItem   InventoryItem? @relation(fields: [inventoryItemId], references: [id])

  description      String
  quantityRequired Decimal @db.Decimal(10, 3)
  quantityUnit     String  @default("units")
  isFulfilled      Boolean @default(false)

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([orderItemId])
  @@index([organizationId])
  @@map("required_materials")
}
```

Also add `requiredMaterials RequiredMaterial[]` to `OrderItem` relations.
Also add `requiredMaterials RequiredMaterial[]` to `InventoryItem` relations.
Also add `requiredMaterials RequiredMaterial[]` to `Organization` relations.

- [ ] **Step 4: Add `MaterialUsage` model**

Add after `RequiredMaterial`:
```prisma
// ─── Material Usage ───────────────────────────────────────────────────────────

model MaterialUsage {
  id      String @id @default(cuid())
  orderId String
  order   Order  @relation(fields: [orderId], references: [id], onDelete: Cascade)

  inventoryItemId String
  inventoryItem   InventoryItem @relation(fields: [inventoryItemId], references: [id])

  quantityUsed Decimal @db.Decimal(10, 3)
  quantityUnit String  @default("units")
  notes        String?
  usedBy       String

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@index([orderId])
  @@index([inventoryItemId])
  @@index([organizationId])
  @@map("material_usage")
}
```

Also add `materialUsages MaterialUsage[]` to `Order` relations.
Also add `materialUsages MaterialUsage[]` to `InventoryItem` relations.
Also add `materialUsages MaterialUsage[]` to `Organization` relations.

- [ ] **Step 5: Add `POReceiving` and `POReceivingItem` models**

Add after `PurchaseOrderItem`:
```prisma
// ─── PO Receiving ─────────────────────────────────────────────────────────────

model POReceiving {
  id              String        @id @default(cuid())
  purchaseOrderId String
  purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)

  receivedBy String
  notes      String?
  receivedAt DateTime @default(now())

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  items POReceivingItem[]

  @@index([purchaseOrderId])
  @@index([organizationId])
  @@map("po_receivings")
}

// ─── PO Receiving Item ────────────────────────────────────────────────────────

model POReceivingItem {
  id            String      @id @default(cuid())
  poReceivingId String
  poReceiving   POReceiving @relation(fields: [poReceivingId], references: [id], onDelete: Cascade)

  purchaseOrderItemId String
  purchaseOrderItem   PurchaseOrderItem @relation(fields: [purchaseOrderItemId], references: [id])

  inventoryItemId String?
  inventoryItem   InventoryItem? @relation(fields: [inventoryItemId], references: [id])

  quantityReceived Int
  notes            String?
  isAccepted       Boolean @default(true)

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@index([poReceivingId])
  @@index([organizationId])
  @@map("po_receiving_items")
}
```

Add back-references:
- `POReceiving[]` to `PurchaseOrder` model
- `POReceivingItem[]` to `PurchaseOrderItem` model
- `POReceivingItem[]` to `InventoryItem` model
- `poReceivings POReceiving[]` to `Organization` model
- `poReceivingItems POReceivingItem[]` to `Organization` model

- [ ] **Step 6: Add `ShipmentStatusHistory` model**

Add after `Shipment`:
```prisma
// ─── Shipment Status History ──────────────────────────────────────────────────

model ShipmentStatusHistory {
  id         String   @id @default(cuid())
  shipmentId String
  shipment   Shipment @relation(fields: [shipmentId], references: [id], onDelete: Cascade)

  fromStatus ShipmentStatus?
  toStatus   ShipmentStatus
  changedBy  String
  notes      String?
  location   String?

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@index([shipmentId, createdAt(sort: Desc)])
  @@index([organizationId])
  @@map("shipment_status_history")
}
```

Also add `statusHistory ShipmentStatusHistory[]` to `Shipment` model.
Also add `shipmentStatusHistories ShipmentStatusHistory[]` to `Organization` model.

- [ ] **Step 7: Add `ActivityLog` model**

Add at the end of the schema:
```prisma
// ─── Activity Log ─────────────────────────────────────────────────────────────

enum ActivityAction {
  CREATED
  UPDATED
  DELETED
  STATUS_CHANGED
  ASSIGNED
  COMMENTED
  EXPORTED
  IMPORTED
  RECEIVED
  SHIPPED
  INVOICED
  PAID
}

model ActivityLog {
  id           String         @id @default(cuid())
  action       ActivityAction
  entityType   String
  entityId     String
  entityLabel  String?
  description  String
  metadata     Json?

  performedBy  String
  ipAddress    String?

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@index([organizationId, createdAt(sort: Desc)])
  @@index([entityType, entityId])
  @@index([organizationId])
  @@map("activity_logs")
}
```

Also add `activityLogs ActivityLog[]` to `Organization` model.

- [ ] **Step 8: Regenerate Prisma client**

```bash
cd backend && npm run db:generate
```

Expected: `✔ Generated Prisma Client` with no errors.

---

## Task 2: Environment Config (`env.ts`)

**Files:**
- Create: `backend/src/config/env.ts`

- [ ] **Step 1: Create `backend/src/config/env.ts`**

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CLERK_SECRET_KEY: z.string().min(1, 'CLERK_SECRET_KEY is required'),
  CLERK_PUBLISHABLE_KEY: z.string().min(1, 'CLERK_PUBLISHABLE_KEY is required'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
});

function parseEnv(): z.infer<typeof envSchema> {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const missing = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${missing}`);
  }

  return result.data;
}

export const env = parseEnv();
export type Env = typeof env;
```

- [ ] **Step 2: Update `backend/src/index.ts` to use `env` instead of raw `process.env`**

Replace the top of `backend/src/index.ts`:

Add import after `'dotenv/config'`:
```typescript
import { env } from './config/env';
```

Replace the startup guard block (the `REQUIRED_ENV_VARS` loop) with:
```typescript
// env.ts performs all validation at import time — no manual checks needed
```

Replace `process.env['CORS_ORIGINS']?.split(',') ?? [...]` occurrences (there are 2) with:
```typescript
env.CORS_ORIGINS.split(',')
```

Replace `process.env['CLERK_SECRET_KEY'] as string` with:
```typescript
env.CLERK_SECRET_KEY
```

Replace the PORT line:
```typescript
const PORT = env.PORT;
```

- [ ] **Step 3: Verify typecheck still passes**

```bash
cd backend && npm run typecheck
```

Expected: zero errors.

---

## Task 3: Validation Middleware (`validate.ts`)

**Files:**
- Create: `backend/src/middleware/validate.ts`

- [ ] **Step 1: Create `backend/src/middleware/validate.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type RequestPart = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      const err = new ZodError(result.error.issues);
      return next(err);
    }

    // Replace with validated + coerced data
    (req as Record<string, unknown>)[part] = result.data;
    next();
  };
}
```

The `errorHandler` in `middleware/errorHandler.ts` already handles `ZodError` instances and returns a `400` with field errors — no changes needed there.

- [ ] **Step 2: Verify typecheck**

```bash
cd backend && npm run typecheck
```

Expected: zero errors.

---

## Task 4: Number Generators (`generators.ts`)

**Files:**
- Create: `backend/src/utils/generators.ts`

- [ ] **Step 1: Create `backend/src/utils/generators.ts`**

```typescript
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

/**
 * Generates a sequential order number scoped to an organization.
 * Format: {prefix}-{YYYY}{MM}-{NNNN} e.g. ORD-202401-0042
 */
export async function generateOrderNumber(
  organizationId: string,
  prefix: string = 'ORD',
): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const yearMonth = `${year}${month}`;

  const pattern = `${prefix}-${yearMonth}-%`;

  const lastOrder = await prisma.order.findFirst({
    where: {
      organizationId,
      orderNumber: { startsWith: `${prefix}-${yearMonth}-` },
    },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  });

  let sequence = 1;
  if (lastOrder) {
    const parts = lastOrder.orderNumber.split('-');
    const lastSeq = parseInt(parts[parts.length - 1] ?? '0', 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  const orderNumber = `${prefix}-${yearMonth}-${String(sequence).padStart(4, '0')}`;
  logger.debug(`Generated order number: ${orderNumber}`);
  return orderNumber;
}

/**
 * Generates a sequential PO number scoped to an organization.
 * Format: PO-{YYYY}{MM}-{NNNN} e.g. PO-202401-0001
 */
export async function generatePONumber(organizationId: string): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const yearMonth = `${year}${month}`;

  const lastPO = await prisma.purchaseOrder.findFirst({
    where: {
      organizationId,
      poNumber: { startsWith: `PO-${yearMonth}-` },
    },
    orderBy: { poNumber: 'desc' },
    select: { poNumber: true },
  });

  let sequence = 1;
  if (lastPO) {
    const parts = lastPO.poNumber.split('-');
    const lastSeq = parseInt(parts[parts.length - 1] ?? '0', 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  const poNumber = `PO-${yearMonth}-${String(sequence).padStart(4, '0')}`;
  logger.debug(`Generated PO number: ${poNumber}`);
  return poNumber;
}

/**
 * Generates a cryptographically random invite token.
 */
export function generateInviteToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a URL-friendly slug from a string.
 * e.g. "Acme T-Shirts" → "acme-t-shirts"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd backend && npm run typecheck
```

Expected: zero errors.

---

## Task 5: Seed File

**Files:**
- Create: `backend/prisma/seed.ts`

- [ ] **Step 1: Create `backend/prisma/seed.ts`**

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database...');

  // Create a default organization for local development
  // In production, orgs are created via Clerk org creation webhook
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-tshirt-co' },
    update: {},
    create: {
      clerkOrgId: 'org_demo_placeholder',
      slug: 'demo-tshirt-co',
      name: 'Demo T-Shirt Co',
      subdomain: 'demo',
      plan: 'FREE',
      orderNumberPrefix: 'ORD',
      currency: 'USD',
      timezone: 'America/New_York',
      taxRate: 0.0875,
    },
  });

  console.log(`✓ Organization: ${org.name} (${org.id})`);

  // Create sample vendors
  const vendors = await Promise.all([
    prisma.vendor.upsert({
      where: { id: 'vendor_sample_1' },
      update: {},
      create: {
        id: 'vendor_sample_1',
        name: 'Blank Shirt Supply Co',
        contactName: 'John Smith',
        email: 'orders@blanksupply.example',
        phone: '555-0100',
        categories: ['BLANK_SHIRTS'],
        paymentTerms: 'Net 30',
        leadTimeDays: 5,
        organizationId: org.id,
      },
    }),
    prisma.vendor.upsert({
      where: { id: 'vendor_sample_2' },
      update: {},
      create: {
        id: 'vendor_sample_2',
        name: 'DTF Print Masters',
        contactName: 'Jane Doe',
        email: 'orders@dtfmasters.example',
        phone: '555-0200',
        categories: ['DTF_TRANSFERS'],
        paymentTerms: 'Net 15',
        leadTimeDays: 3,
        organizationId: org.id,
      },
    }),
  ]);

  console.log(`✓ Vendors: ${vendors.length} created`);

  // Create sample inventory items
  const inventoryItems = await Promise.all([
    prisma.inventoryItem.upsert({
      where: { sku_organizationId: { sku: 'BLANK-BKTEE-BLK-M', organizationId: org.id } },
      update: {},
      create: {
        sku: 'BLANK-BKTEE-BLK-M',
        name: 'Blank T-Shirt - Black - Medium',
        category: 'BLANK_SHIRTS',
        brand: 'Bella+Canvas',
        size: 'M',
        color: 'Black',
        quantityOnHand: 50,
        reorderPoint: 20,
        reorderQuantity: 100,
        costPrice: 4.50,
        organizationId: org.id,
      },
    }),
    prisma.inventoryItem.upsert({
      where: { sku_organizationId: { sku: 'BLANK-BKTEE-WHT-M', organizationId: org.id } },
      update: {},
      create: {
        sku: 'BLANK-BKTEE-WHT-M',
        name: 'Blank T-Shirt - White - Medium',
        category: 'BLANK_SHIRTS',
        brand: 'Bella+Canvas',
        size: 'M',
        color: 'White',
        quantityOnHand: 50,
        reorderPoint: 20,
        reorderQuantity: 100,
        costPrice: 4.50,
        organizationId: org.id,
      },
    }),
    prisma.inventoryItem.upsert({
      where: { sku_organizationId: { sku: 'DTF-12X10-FULL', organizationId: org.id } },
      update: {},
      create: {
        sku: 'DTF-12X10-FULL',
        name: 'DTF Transfer - 12x10 Full Color',
        category: 'DTF_TRANSFERS',
        quantityOnHand: 0,
        reorderPoint: 10,
        reorderQuantity: 50,
        costPrice: 2.75,
        organizationId: org.id,
      },
    }),
  ]);

  console.log(`✓ Inventory items: ${inventoryItems.length} created`);

  // Create a sample customer
  const customer = await prisma.customer.upsert({
    where: { id: 'customer_sample_1' },
    update: {},
    create: {
      id: 'customer_sample_1',
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice@example.com',
      phone: '555-0300',
      company: 'Johnson Events LLC',
      organizationId: org.id,
    },
  });

  console.log(`✓ Customer: ${customer.firstName} ${customer.lastName}`);

  console.log('\nSeed complete ✓');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
```

- [ ] **Step 2: Add seed script to `backend/package.json`**

The `db:seed` script already exists in package.json (`"db:seed": "tsx prisma/seed.ts"`). No change needed.

- [ ] **Step 3: Verify typecheck**

```bash
cd backend && npm run typecheck
```

Expected: zero errors.

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| `PENDING_APPROVAL`, `ON_HOLD` order statuses | Task 1 Step 1 |
| `DTG` print method | Task 1 Step 1 |
| `OrderStatusHistory` | Task 1 Step 2 |
| `RequiredMaterial` | Task 1 Step 3 |
| `MaterialUsage` | Task 1 Step 4 |
| `POReceiving` + `POReceivingItem` | Task 1 Step 5 |
| `ShipmentStatusHistory` | Task 1 Step 6 |
| `ActivityLog` | Task 1 Step 7 |
| `/config/env.ts` (env validation) | Task 2 |
| `/middleware/validate.ts` | Task 3 |
| `/utils/generators.ts` (order/PO numbers) | Task 4 |
| Seed data with default org | Task 5 |
| `bcryptjs`/`jsonwebtoken` auth | **Skipped** — Clerk handles auth |
| `docker-compose.yml` | **Skipped** — already exists |
| `package.json` / `tsconfig.json` | **Skipped** — already exist |
| `app.ts` entry point | **Skipped** — already `src/index.ts` |
| `/config/database.ts` | **Skipped** — already `src/lib/prisma.ts` |
| InventoryCategory model | **Kept as enum** — cleaner, already done |
| `StockMovement` types (IN/OUT/etc.) | Task 1 Step 1 (enum rename) |

**Placeholder scan:** None found — all steps contain complete code.

**Type consistency:** `organizationId` on all new models, all back-references added, all relation lists updated.
