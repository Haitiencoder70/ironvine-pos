# Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every issue found in the full codebase audit — security gaps, broken upload, missing endpoints, bad touch targets, dead code, schema issues, and missing env docs.

**Architecture:** 16 self-contained tasks ordered by risk/priority. Tasks 1–7 are pure code changes (no migration). Tasks 8 requires a Prisma migration. Tasks 9–16 are config, frontend, and feature additions. Each task commits independently.

**Tech Stack:** Express 5 + Prisma 6 + Clerk + React 18 + React Query v5 + Zod + Tailwind CSS

---

## File Map

| File | Tasks that touch it |
|------|-------------------|
| `backend/src/middleware/tenantIsolation.ts` | 1 |
| `frontend/src/components/images/ImageUploader.tsx` | 2 |
| `backend/src/routes/pos.ts` | 3 |
| `backend/src/routes/analytics.ts` | 4 |
| `backend/src/routes/branding.ts` | 5 |
| `backend/src/routes/orders.ts` | 6 |
| `backend/src/routes/inventory.ts` | 6 |
| `backend/src/routes/customers.ts` | 6 |
| `backend/src/routes/auditLog.ts` | 7 |
| `backend/prisma/schema.prisma` | 8 |
| `backend/prisma/migrations/…` | 8 |
| `.env.example` | 9 |
| `backend/src/routes/stripeRoutes.ts` | 10 (delete) |
| `frontend/src/components/ui/Select.tsx` | 11 |
| `frontend/src/components/ui/Omnibar.tsx` | 12 |
| `frontend/src/components/ui/Table.tsx` | 13 |
| `frontend/src/components/ui/TouchCard.tsx` | 13 |
| `backend/src/services/analyticsService.ts` | 13 |
| `backend/src/services/vendorService.ts` | 14 |
| `backend/src/controllers/vendorController.ts` | 14 |
| `backend/src/routes/vendors.ts` | 14 |
| `frontend/src/pages/reports/ProductionReport.tsx` (new) | 15 |
| `frontend/src/pages/Reports.tsx` | 15 |
| `frontend/src/pages/reports/Reports.tsx` | 15 |
| `frontend/src/App.tsx` | 16 |

---

## Task 1: Exclude GarmentImage from Tenant Isolation

**Files:**
- Modify: `backend/src/middleware/tenantIsolation.ts:8`

The `GarmentImage` model is a global garment catalog with no `organizationId` column. The tenant isolation Prisma extension currently only excludes `Organization`. When any code touches `GarmentImage` inside a request context, the extension tries to inject `organizationId` into the query args — this causes a Prisma validation error at runtime.

- [ ] **Step 1: Add GarmentImage to excluded models**

In `backend/src/middleware/tenantIsolation.ts`, change line 8:

```typescript
// Before:
const EXCLUDED_MODELS = new Set(['Organization']);

// After:
const EXCLUDED_MODELS = new Set(['Organization', 'GarmentImage']);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/middleware/tenantIsolation.ts
git commit -m "fix: exclude GarmentImage from tenant isolation extension"
```

---

## Task 2: Fix ImageUploader — Real API Upload

**Files:**
- Modify: `frontend/src/components/images/ImageUploader.tsx:62-98`

The `uploadFile()` function is completely fake — it uses `setTimeout` and never calls the backend. The backend has a real `POST /api/images/upload` endpoint that accepts `multipart/form-data` with a `file` field plus `imageType`, `entityType`, `entityId` body fields.

- [ ] **Step 1: Replace the fake uploadFile with a real implementation**

In `frontend/src/components/images/ImageUploader.tsx`, replace lines 61–98 (the `// Simulated upload` comment through the closing `}`) with:

```typescript
import { api } from '../../lib/api';
import type { AxiosProgressEvent } from 'axios';
```

Add that import at the top of the file (after the existing imports), then replace the entire `uploadFile` function:

```typescript
async function uploadFile(
  file: File,
  entityType: string,
  entityId: string,
  imageType: ImageType,
  onProgress: (p: number) => void,
): Promise<Image> {
  const form = new FormData();
  form.append('file', file);
  form.append('entityType', entityType);
  form.append('entityId', entityId);
  form.append('imageType', imageType);

  const response = await api.post<{ data: Image }>('/images/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event: AxiosProgressEvent) => {
      if (event.total) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    },
  });

  return response.data.data;
}
```

Also remove the `// Simulated upload — replace with real API call when backend image endpoint exists` comment on line 61.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/images/ImageUploader.tsx
git commit -m "fix: ImageUploader now calls real POST /api/images/upload endpoint"
```

---

## Task 3: Add authorize() to POS Routes

**Files:**
- Modify: `backend/src/routes/pos.ts`

All three POS routes have no permission check. Any authenticated user (including VIEWER role) can call `POST /api/pos/sale`. The `pos:view` and `pos:create` permissions already exist in `config/permissions.ts` and only allow OWNER/ADMIN/MANAGER.

- [ ] **Step 1: Add authorize middleware to POS routes**

Replace the entire contents of `backend/src/routes/pos.ts` with:

```typescript
import { Router } from 'express';

import { authorize } from '../middleware/authorize';
import { getProductsHandler, completeSaleHandler, getSaleHistoryHandler } from '../controllers/posController';

export const posRouter = Router();

// ─── Products ──────────────────────────────────────────────────────────────────
posRouter.get('/products', authorize('pos:view'), getProductsHandler);

// ─── Complete Sale ─────────────────────────────────────────────────────────────
posRouter.post('/sale', authorize('pos:create'), completeSaleHandler);

// ─── Sale History ──────────────────────────────────────────────────────────────
posRouter.get('/sales', authorize('pos:view'), getSaleHistoryHandler);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/pos.ts
git commit -m "fix: add authorize() permission checks to all POS routes"
```

---

## Task 4: Add authorize() to Analytics Routes

**Files:**
- Modify: `backend/src/routes/analytics.ts`

All three analytics routes have no `authorize()` call. Any authenticated org member can read usage analytics. The `reports:view` permission restricts to OWNER/ADMIN/MANAGER.

- [ ] **Step 1: Add authorize middleware to analytics routes**

Replace the entire contents of `backend/src/routes/analytics.ts` with:

```typescript
import { Router } from 'express';
import { authorize } from '../middleware/authorize';
import { currentPeriodHandler, periodRangeHandler, exportHandler } from '../controllers/analyticsController';

const router = Router();

router.get('/current', authorize('reports:view'), currentPeriodHandler);
router.get('/range',   authorize('reports:view'), periodRangeHandler);
router.get('/export',  authorize('reports:export'), exportHandler);

export { router as analyticsRouter };
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/analytics.ts
git commit -m "fix: add authorize() to analytics routes (reports:view / reports:export)"
```

---

## Task 5: Add authorize() to Branding Routes

**Files:**
- Modify: `backend/src/routes/branding.ts`

Branding routes have no `authorize()`. Any authenticated member can overwrite org branding. The write operations do check plan tier (PRO/ENTERPRISE only) but skip role checks entirely. Use `settings:view` for GET and `settings:edit` for write operations.

- [ ] **Step 1: Add authorize middleware to branding routes**

Replace the entire contents of `backend/src/routes/branding.ts` with:

```typescript
import { Router } from 'express';
import { authorize } from '../middleware/authorize';
import {
  getBrandingHandler,
  saveBrandingHandler,
  uploadLogoHandler,
  uploadFaviconHandler,
  brandingUpload,
} from '../controllers/brandingController';

export const brandingRouter = Router();

brandingRouter.get('/',                authorize('settings:view'), getBrandingHandler);
brandingRouter.put('/',                authorize('settings:edit'), saveBrandingHandler);
brandingRouter.post('/upload-logo',    authorize('settings:edit'), brandingUpload.single('file'), uploadLogoHandler);
brandingRouter.post('/upload-favicon', authorize('settings:edit'), brandingUpload.single('file'), uploadFaviconHandler);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/branding.ts
git commit -m "fix: add authorize() to branding routes (settings:view / settings:edit)"
```

---

## Task 6: Fix Plan Limit Middleware — Use DB-Driven Checkers

**Files:**
- Modify: `backend/src/routes/orders.ts`
- Modify: `backend/src/routes/inventory.ts`
- Modify: `backend/src/routes/customers.ts`

`limits.ts` reads plan limits from a hardcoded constant and returns 403 (wrong HTTP code — payment limits should be 402). `usage.ts` reads from the DB org record (respects per-org custom overrides) and returns 402. Routes currently use `limits.ts`. Switch them to use `usage.ts`.

- [ ] **Step 1: Fix orders.ts**

In `backend/src/routes/orders.ts`, replace:
```typescript
import { checkLimit } from '../middleware/limits';
```
with:
```typescript
import { checkOrderLimit } from '../middleware/usage';
```

Then replace `checkLimit('orders')` with `checkOrderLimit`:
```typescript
// Before:
ordersRouter.post('/', authorize('orders:create'), checkLimit('orders'), validate(createOrderSchema), create);

// After:
ordersRouter.post('/', authorize('orders:create'), checkOrderLimit, validate(createOrderSchema), create);
```

- [ ] **Step 2: Fix inventory.ts**

In `backend/src/routes/inventory.ts`, replace:
```typescript
import { checkLimit } from '../middleware/limits';
```
with:
```typescript
import { checkInventoryLimit } from '../middleware/usage';
```

Then replace `checkLimit('inventoryItems')` with `checkInventoryLimit`:
```typescript
// Before:
inventoryRouter.post('/', authorize('inventory:create'), checkLimit('inventoryItems'), validate(createInventoryItemSchema), create);

// After:
inventoryRouter.post('/', authorize('inventory:create'), checkInventoryLimit, validate(createInventoryItemSchema), create);
```

- [ ] **Step 3: Add customer limit check to customers.ts**

In `backend/src/routes/customers.ts`, add the import:
```typescript
import { checkCustomerLimit } from '../middleware/usage';
```

Then add `checkCustomerLimit` to the POST route:
```typescript
// Before:
customersRouter.post('/', authorize('customers:create'), validate(createCustomerSchema), create);

// After:
customersRouter.post('/', authorize('customers:create'), checkCustomerLimit, validate(createCustomerSchema), create);
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/orders.ts backend/src/routes/inventory.ts backend/src/routes/customers.ts
git commit -m "fix: switch plan limit checks to DB-driven usage.ts (respects per-org limits, returns 402)"
```

---

## Task 7: Fix Audit Log Route

**Files:**
- Modify: `backend/src/routes/auditLog.ts`

Two bugs: (1) The query filters `action: 'PERMISSION_DENIED'` only — this makes the audit log useless as it only shows access denials, not creations, updates, deletions, etc. (2) The catch block uses `res.status(500).json(...)` directly instead of `next(error)`, bypassing the global error handler and Sentry.

- [ ] **Step 1: Fix both bugs**

Replace the entire contents of `backend/src/routes/auditLog.ts` with:

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authorize } from '../middleware/authorize';

export const auditLogRouter = Router();

auditLogRouter.get('/', authorize('settings:view'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const organizationId = req.organizationDbId;
    if (!organizationId) {
      res.status(400).json({ error: 'Missing organization context' });
      return;
    }

    const rawLimit = parseInt((req.query['limit'] as string) ?? '50', 10);
    const rawPage  = parseInt((req.query['page']  as string) ?? '1',  10);
    const limit    = Math.min(Math.max(rawLimit, 1), 200);
    const page     = Math.max(rawPage, 1);
    const skip     = (page - 1) * limit;

    const [data, total] = await prisma.$transaction([
      prisma.activityLog.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activityLog.count({ where: { organizationId } }),
    ]);

    res.json({ data, total, page, limit });
  } catch (error) {
    next(error);
  }
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/auditLog.ts
git commit -m "fix: audit log returns all activity (not just permission denials), errors forwarded to global handler"
```

---

## Task 8: Database Schema — Add Missing Indexes and Fix onDelete Relations

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: migration via `prisma migrate dev`

Two issues: (1) `MaterialUsage` has no `@@index([organizationId])` — tenant-scoped queries are full-table scans. (2) `Order → Customer` relation has no `onDelete` — deleting a customer with orders will throw a FK constraint error. (3) `StockMovement → Order` has no `onDelete` — deleting an order with stock movements will also fail. (4) `MaterialUsage → InventoryItem` has no `onDelete` — if an inventory item is (soft-)deleted the hard delete path will throw.

- [ ] **Step 1: Add organizationId index to MaterialUsage in schema.prisma**

In `backend/prisma/schema.prisma`, find the `MaterialUsage` model (around line 390). Add `@@index([organizationId])` before `@@map("material_usage")`:

```prisma
model MaterialUsage {
  id              String        @id @default(cuid())
  orderId         String
  inventoryItemId String
  quantityUsed    Decimal       @db.Decimal(10, 3)
  quantityUnit    String        @default("units")
  notes           String?
  usedBy          String
  organizationId  String
  createdAt       DateTime      @default(now())
  inventoryItem   InventoryItem @relation(fields: [inventoryItemId], references: [id])
  order           Order         @relation(fields: [orderId], references: [id], onDelete: Cascade)
  organization    Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([orderId])
  @@index([inventoryItemId])
  @@index([organizationId])
  @@map("material_usage")
}
```

- [ ] **Step 2: Fix Order → Customer onDelete (add Restrict)**

In `backend/prisma/schema.prisma`, find the `Order` model's `customer` relation (around line 158) and add `onDelete: Restrict`:

```prisma
  customer       Customer             @relation(fields: [customerId], references: [id], onDelete: Restrict)
```

This prevents deleting a customer who still has orders, which is the correct business behaviour. The customer delete endpoint in `customerController.ts` should already handle the P2003 FK error gracefully via the global error handler's `P2003` case (returns 400 "Referenced record does not exist").

- [ ] **Step 3: Fix StockMovement → Order onDelete (add Cascade)**

In `backend/prisma/schema.prisma`, find the `StockMovement` model's `order` relation (around line 241) and add `onDelete: Cascade`:

```prisma
  order           Order?            @relation(fields: [orderId], references: [id], onDelete: Cascade)
```

- [ ] **Step 4: Run the migration**

```bash
cd backend && npx prisma migrate dev --name "add_material_usage_index_fix_ondelete"
```

Expected output: migration created and applied, Prisma client regenerated.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "fix: add MaterialUsage organizationId index, set onDelete Restrict/Cascade on Order relations"
```

---

## Task 9: Fix .env.example — Document Missing Variables

**Files:**
- Modify: `.env.example`

Four variables are used in backend code but not documented in `.env.example`: `DIRECT_URL` (required by Prisma for direct DB connection during migrations), `REDIS_URL` (cache service), `SENTRY_DSN` (error monitoring), and `VITE_DEV_SUBDOMAIN` (local multi-tenant dev override).

- [ ] **Step 1: Update .env.example**

Replace the entire contents of `.env.example` with:

```
# ----------------------------------------
# Docker / Database (Used by docker-compose)
# ----------------------------------------
POSTGRES_USER=posuser
POSTGRES_PASSWORD=possecurepassword
POSTGRES_DB=tshirtpos
PGADMIN_EMAIL=admin@pos.example.com
PGADMIN_PASSWORD=adminsecure

# ----------------------------------------
# Backend (copy to backend/.env)
# ----------------------------------------

# Primary DB connection (pooled — used for queries)
DATABASE_URL=postgresql://posuser:possecurepassword@postgres:5432/tshirtpos?schema=public

# Direct DB connection (non-pooled — required by Prisma migrate)
DIRECT_URL=postgresql://posuser:possecurepassword@postgres:5432/tshirtpos?schema=public

# Clerk Authentication (Required)
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...

# Stripe (Required for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...

# Resend (Required for emails)
RESEND_API_KEY=re_...

# Redis Cache (Optional — app runs without it, just no caching)
REDIS_URL=redis://localhost:6379

# Sentry Error Monitoring (Optional — disabled if not set)
SENTRY_DSN=https://...@sentry.io/...

# General Configuration
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://pos.printflowpos.com
CORS_ORIGINS=https://pos.printflowpos.com,http://localhost:5173

# ----------------------------------------
# Frontend (copy to frontend/.env)
# ----------------------------------------
VITE_API_URL=https://pos.printflowpos.com/api
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_SOCKET_URL=https://pos.printflowpos.com

# Local dev: force a tenant subdomain without a real subdomain (e.g. "ironvine")
# VITE_DEV_SUBDOMAIN=ironvine
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add DIRECT_URL, REDIS_URL, SENTRY_DSN, VITE_DEV_SUBDOMAIN to .env.example"
```

---

## Task 10: Remove Dead File stripeRoutes.ts

**Files:**
- Delete: `backend/src/routes/stripeRoutes.ts`

`stripeRoutes.ts` is never imported or mounted in `app.ts`. It re-exports the billing handlers under different names and has no `authorize()` checks on its checkout/portal routes. It's dead code that could mislead developers.

- [ ] **Step 1: Delete the file**

```bash
rm "backend/src/routes/stripeRoutes.ts"
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors (nothing imports this file).

- [ ] **Step 3: Commit**

```bash
git add -A backend/src/routes/stripeRoutes.ts
git commit -m "chore: remove dead stripeRoutes.ts (not mounted, replaced by billing.ts)"
```

---

## Task 11: Fix Select.tsx Touch Target

**Files:**
- Modify: `frontend/src/components/ui/Select.tsx:136`

The search input inside the Select dropdown uses `min-h-[40px]` which is 4px below the 44px minimum required by CLAUDE.md.

- [ ] **Step 1: Fix the min-height**

In `frontend/src/components/ui/Select.tsx`, find line 136 (the search input inside the dropdown `ListboxOptions`):

```tsx
// Before:
                    className="min-h-[40px]"

// After:
                    className="min-h-[44px]"
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/Select.tsx
git commit -m "fix: Select dropdown search input min-height 40px → 44px (touch target requirement)"
```

---

## Task 12: Fix Omnibar Touch Targets

**Files:**
- Modify: `frontend/src/components/ui/Omnibar.tsx`

The three result list item buttons (orders, inventory, customers) at lines 114, 136, 158 use `py-2` which gives only ~32px of height for typical content. They need `min-h-[44px]` for reliable touch access.

- [ ] **Step 1: Add min-h-[44px] to all three result item buttons**

In `frontend/src/components/ui/Omnibar.tsx`, find the three `className` strings for result items:

For order results (around line 114):
```tsx
// Before:
className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50 text-left transition-colors"

// After:
className="w-full flex items-center justify-between px-3 py-2 min-h-[44px] rounded-xl hover:bg-gray-50 text-left transition-colors"
```

For inventory results (around line 136):
```tsx
// Before:
className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50 text-left transition-colors"

// After:
className="w-full flex items-center justify-between px-3 py-2 min-h-[44px] rounded-xl hover:bg-gray-50 text-left transition-colors"
```

For customer results (around line 158):
```tsx
// Before:
className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50 text-left transition-colors"

// After:
className="w-full flex items-center justify-between px-3 py-2 min-h-[44px] rounded-xl hover:bg-gray-50 text-left transition-colors"
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/Omnibar.tsx
git commit -m "fix: add min-h-[44px] to Omnibar result list items"
```

---

## Task 13: Fix `any` Types

**Files:**
- Modify: `frontend/src/components/ui/Table.tsx:47`
- Modify: `frontend/src/components/ui/TouchCard.tsx:90`
- Modify: `backend/src/services/analyticsService.ts:20`

### Table.tsx

The `(obj as any)?.[k]` is used for dynamic key access on an unknown object. We can type it properly.

- [ ] **Step 1: Fix Table.tsx**

In `frontend/src/components/ui/Table.tsx`, find line 47 (inside the cell renderer that does `(obj as any)?.[k]`). Replace the `as any` with a typed access:

```tsx
// Before:
        return (obj as any)?.[k];

// After:
        return (obj as Record<string, unknown>)?.[k];
```

### TouchCard.tsx

The `{...(props as any)}` is used to spread props onto a polymorphic component. Fix with a proper type assertion.

- [ ] **Step 2: Fix TouchCard.tsx**

In `frontend/src/components/ui/TouchCard.tsx`, find line 90 (the `{...(props as any)}`):

```tsx
// Before:
        {...(props as any)}

// After:
        {...(props as React.HTMLAttributes<HTMLElement>)}
```

### analyticsService.ts

The `metadata as any` is used because Prisma's `Json` field type doesn't accept `unknown`. Use `Prisma.JsonObject` or cast to `Prisma.InputJsonValue`.

- [ ] **Step 3: Fix analyticsService.ts**

In `backend/src/services/analyticsService.ts`, find line 19–20. Replace:

```typescript
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { organizationId, metricType, count: 1, metadata: (metadata as any) ?? undefined },
```

with:

```typescript
      data: { organizationId, metricType, count: 1, metadata: metadata ?? undefined },
```

(Prisma's `Json` field accepts `unknown` when the value is `null | undefined | Record<...>`. The `?? undefined` already handles the null case, so the `as any` cast is not needed when `metadata` is typed as `Record<string, unknown> | undefined`.)

- [ ] **Step 4: Verify TypeScript compiles for both**

```bash
cd frontend && npx tsc --noEmit
cd ../backend && npx tsc --noEmit
```
Expected: no errors in either.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/Table.tsx frontend/src/components/ui/TouchCard.tsx backend/src/services/analyticsService.ts
git commit -m "fix: replace 'any' types in Table, TouchCard, analyticsService with proper types"
```

---

## Task 14: Vendor Delete — Backend Endpoint

**Files:**
- Modify: `backend/src/services/vendorService.ts`
- Modify: `backend/src/controllers/vendorController.ts`
- Modify: `backend/src/routes/vendors.ts`

The frontend already has `useDeleteVendor` hook, `vendorApi.delete()` client method, and the delete button wired up in `VendorDetailPage`. Only the backend is missing the endpoint.

- [ ] **Step 1: Add deleteVendor to vendorService.ts**

In `backend/src/services/vendorService.ts`, append the following function at the end of the file:

```typescript
export async function deleteVendor(organizationId: string, vendorId: string): Promise<void> {
  const existing = await prisma.vendor.findFirst({
    where: { id: vendorId, organizationId },
    select: { id: true },
  });
  if (!existing) throw new AppError(404, 'Vendor not found', 'NOT_FOUND');

  await prisma.vendor.delete({ where: { id: vendorId } });
}
```

- [ ] **Step 2: Add deleteVendor handler to vendorController.ts**

In `backend/src/controllers/vendorController.ts`, add this import to the top of the file:

```typescript
import { createVendor, updateVendor, getVendors, getVendorById, deleteVendor } from '../services/vendorService';
```

Then append the handler at the end of the file:

```typescript
export const deleteVendorHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orgDbId = authReq.organizationDbId!;
    await deleteVendor(orgDbId, authReq.params['id'] as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
```

- [ ] **Step 3: Add DELETE route to vendors.ts**

In `backend/src/routes/vendors.ts`, add the new import and route:

```typescript
import {
  getAll,
  getById,
  create,
  update,
  deleteVendorHandler,
} from '../controllers/vendorController';
```

Then add at the end of the file:

```typescript
// ─── Delete Vendor ────────────────────────────────────────────────────────────
vendorsRouter.delete('/:id', authorize('inventory:delete'), deleteVendorHandler);
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/vendorService.ts backend/src/controllers/vendorController.ts backend/src/routes/vendors.ts
git commit -m "feat: add DELETE /api/vendors/:id endpoint (backend was missing, frontend already wired)"
```

---

## Task 15: Production Report Page

**Files:**
- Create: `frontend/src/pages/reports/ProductionReport.tsx`
- Modify: `frontend/src/pages/Reports.tsx` (add route)
- Modify: `frontend/src/pages/reports/Reports.tsx` (add nav link)

The backend has `GET /api/reports/production`, the `reportApi.getProduction()` client method exists, and the `ProductionReport` TypeScript interface is defined. Only the standalone page and its route are missing.

The production report returns: `{ avgProductionDays, completedCount, ordersByPrintMethod: [{method, count}][], ordersByPriority: [{priority, count}][] }`.

- [ ] **Step 1: Create ProductionReport.tsx**

Create `frontend/src/pages/reports/ProductionReport.tsx`:

```tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { ChevronLeftIcon, ClockIcon, CheckCircleIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { reportApi } from '../../services/api';
import { DateRangePicker, type DateRange } from '../../components/reports/DateRangePicker';
import { EmptyState } from '../../components/ui/EmptyState';
import type { JSX } from 'react';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

const PRIORITY_COLOR: Record<string, string> = {
  NORMAL: '#3b82f6',
  HIGH:   '#f59e0b',
  RUSH:   '#ef4444',
};

function SkeletonCard(): JSX.Element {
  return <div className="bg-white rounded-2xl shadow-sm p-5 h-28 animate-pulse bg-gray-50" />;
}

export function ProductionReportPage(): JSX.Element {
  const navigate = useNavigate();
  const [range, setRange] = useState<DateRange>({
    preset: 'this_month',
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    groupBy: 'day',
  });

  const params = {
    preset: range.preset !== 'custom' ? range.preset : undefined,
    startDate: range.preset === 'custom' ? format(range.startDate, 'yyyy-MM-dd') : undefined,
    endDate:   range.preset === 'custom' ? format(range.endDate,   'yyyy-MM-dd') : undefined,
  };

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['reports', 'production', params],
    queryFn: () => reportApi.getProduction(params),
    select: (r) => r.data,
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/reports')}
          className="flex items-center justify-center min-h-[44px] min-w-[44px] -ml-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Production Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">Completed orders, print methods, and throughput</p>
        </div>
      </div>

      <DateRangePicker value={range} onChange={setRange} />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-sm p-5 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-blue-50 flex-shrink-0">
                <ClockIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Days to Complete</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{report?.avgProductionDays ?? 0}</p>
                <p className="text-xs text-gray-400 mt-0.5">from order creation</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-5 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-green-50 flex-shrink-0">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Orders Completed</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{report?.completedCount ?? 0}</p>
                <p className="text-xs text-gray-400 mt-0.5">in selected period</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-5 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-purple-50 flex-shrink-0">
                <WrenchScrewdriverIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Print Methods Used</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{report?.ordersByPrintMethod.length ?? 0}</p>
                <p className="text-xs text-gray-400 mt-0.5">unique methods</p>
              </div>
            </div>
          </>
        )}
      </div>

      {isError && (
        <EmptyState
          title="Failed to load report"
          description="Could not fetch production data. Please try again."
        />
      )}

      {!isLoading && !isError && (report?.completedCount ?? 0) === 0 && (
        <EmptyState
          title="No completed orders"
          description="No orders were completed in the selected date range."
        />
      )}

      {/* Charts */}
      {!isLoading && !isError && (report?.completedCount ?? 0) > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Print Methods */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Items by Print Method</h2>
            {(report?.ordersByPrintMethod.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No print method data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={report?.ordersByPrintMethod ?? []}
                    dataKey="count"
                    nameKey="method"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ method, count }: { method: string; count: number }) =>
                      `${method.replace(/_/g, ' ')} (${count})`
                    }
                  >
                    {(report?.ordersByPrintMethod ?? []).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Orders by Priority */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Orders by Priority</h2>
            {(report?.ordersByPriority.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No priority data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={report?.ordersByPriority ?? []}
                  margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="priority" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Orders" radius={[4, 4, 0, 0]}>
                    {(report?.ordersByPriority ?? []).map((entry) => (
                      <Cell key={entry.priority} fill={PRIORITY_COLOR[entry.priority] ?? '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add the route to Reports.tsx**

In `frontend/src/pages/Reports.tsx`, add the import and route:

```tsx
import { Routes, Route } from 'react-router-dom';
import type { JSX } from 'react';
import { ReportsPage } from './reports/Reports';
import { SalesReportPage } from './reports/SalesReport';
import { InventoryReportPage } from './reports/InventoryReport';
import { ProfitReportPage } from './reports/ProfitReport';
import { ProductionReportPage } from './reports/ProductionReport';

export function ReportsPageRouter(): JSX.Element {
  return (
    <Routes>
      <Route index element={<ReportsPage />} />
      <Route path="sales" element={<SalesReportPage />} />
      <Route path="inventory" element={<InventoryReportPage />} />
      <Route path="profit" element={<ProfitReportPage />} />
      <Route path="production" element={<ProductionReportPage />} />
    </Routes>
  );
}
```

- [ ] **Step 3: Add "Production Report" nav link to reports/Reports.tsx**

In `frontend/src/pages/reports/Reports.tsx`, find the header nav buttons section (around line 128–145 where the Sales/Inventory/Profit links are). Add a Production Report link after the Profit Report link:

```tsx
          <Link
            to="/reports/production"
            className="min-h-[44px] px-4 rounded-xl bg-orange-50 text-orange-700 text-sm font-medium hover:bg-orange-100 transition-colors flex items-center"
          >
            Production Report
          </Link>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/reports/ProductionReport.tsx frontend/src/pages/Reports.tsx frontend/src/pages/reports/Reports.tsx
git commit -m "feat: add Production Report page at /reports/production"
```

---

## Task 16: Wire CreatePOForOrder into App Router

**Files:**
- Modify: `frontend/src/App.tsx`

`frontend/src/pages/purchase-orders/CreatePOForOrder.tsx` exists but has no route in `App.tsx`. It's needed when creating a PO linked to a specific order.

- [ ] **Step 1: Add the import and route**

In `frontend/src/App.tsx`, add the lazy import after the existing `CreatePOPage` import:

```tsx
const CreatePOForOrderPage = lazy(() => import('@/pages/purchase-orders/CreatePOForOrder').then(m => ({ default: m.CreatePOForOrderPage })));
```

Then in the `purchase-orders` route children array (after the `new` route), add:

```tsx
{ path: 'new-for-order/:orderId', element: <Suspense fallback={<PageFallback />}><CreatePOForOrderPage /></Suspense> },
```

The full `purchase-orders` section becomes:

```tsx
{
  path: '/purchase-orders',
  children: [
    { index: true, element: <Suspense fallback={<PageFallback />}><PurchaseOrderListPage /></Suspense> },
    { path: 'new', element: <Suspense fallback={<PageFallback />}><CreatePOPage /></Suspense> },
    { path: 'new-for-order/:orderId', element: <Suspense fallback={<PageFallback />}><CreatePOForOrderPage /></Suspense> },
    { path: ':id', element: <Suspense fallback={<PageFallback />}><PurchaseOrderDetailPage /></Suspense> },
  ]
},
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: wire CreatePOForOrder page into App router at /purchase-orders/new-for-order/:orderId"
```

---

## Self-Review

### Spec coverage check

| Audit Finding | Task |
|---|---|
| GarmentImage causes Prisma runtime error | Task 1 ✓ |
| ImageUploader fake upload (critical) | Task 2 ✓ |
| POS routes missing authorize() | Task 3 ✓ |
| Analytics routes missing authorize() | Task 4 ✓ |
| Branding routes missing authorize() | Task 5 ✓ |
| limits.ts uses hardcoded limits, returns 403 | Task 6 ✓ |
| customers.ts missing plan limit check | Task 6 ✓ |
| auditLog only shows PERMISSION_DENIED | Task 7 ✓ |
| auditLog catch uses res.status() not next() | Task 7 ✓ |
| MaterialUsage missing organizationId index | Task 8 ✓ |
| Order→Customer missing onDelete | Task 8 ✓ |
| StockMovement→Order missing onDelete | Task 8 ✓ |
| .env.example missing DIRECT_URL | Task 9 ✓ |
| .env.example missing REDIS_URL | Task 9 ✓ |
| .env.example missing SENTRY_DSN | Task 9 ✓ |
| .env.example missing VITE_DEV_SUBDOMAIN | Task 9 ✓ |
| stripeRoutes.ts dead code | Task 10 ✓ |
| Select.tsx min-h-[40px] under 44px | Task 11 ✓ |
| Omnibar result items under 44px | Task 12 ✓ |
| `any` in Table.tsx, TouchCard.tsx, analyticsService.ts | Task 13 ✓ |
| Vendor delete endpoint missing (backend) | Task 14 ✓ |
| Production Report page missing | Task 15 ✓ |
| CreatePOForOrder not in router | Task 16 ✓ |

### Items intentionally deferred

- `usage.ts` exported functions that are now wired in via Task 6 — `checkUserLimit` and `checkStorageLimit` still have no callers. These require audit of invite/user-creation flows which is beyond the current scope. Left for a follow-up.
- `MaterialUsage.inventoryItem` has no `onDelete` — setting it to `Restrict` or `SetNull` is a product decision (should we allow deleting inventory items with usage history?). Left for product review.
- `organizationsRoutes.ts` / `organizationRoutes.ts` naming confusion — renaming is a safe refactor but touches many import sites. Left for a dedicated cleanup PR.

### Placeholder scan

No TBD, TODO, "implement later", or "similar to Task N" patterns found.

### Type consistency

- `deleteVendor` service function added in Task 14 matches the import added to the controller.
- `ProductionReportPage` export name in Task 15 matches the import in `Reports.tsx`.
- `CreatePOForOrderPage` export name in Task 16 must match the actual export in `CreatePOForOrder.tsx` — verify before committing Task 16.
