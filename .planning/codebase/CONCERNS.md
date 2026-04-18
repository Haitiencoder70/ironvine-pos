# Codebase Concerns

**Analysis Date:** 2026-04-16

---

## Section 1: Category Field Isolation

### Overview

The system has two distinct "material selection" layers that serve different purposes, and they behave differently with respect to category field isolation:

1. **`components/materials/` — Dedicated Category Forms (Used for order line items / catalog lookup)**
2. **`pages/inventory/AddEditInventory.tsx` — Inventory Item CRUD Form**

---

### 1A. Dedicated Category Forms (components/materials/)

**Verdict: IMPLEMENTED — Field isolation is correctly enforced here.**

Four completely separate React components exist, one per category. Each renders only its own fields and submits only category-relevant data:

| Component | Category | Fields |
|---|---|---|
| `frontend/src/components/materials/GarmentForm.tsx` | BLANK_GARMENTS | brand, styleNumber, color, size, sizeBreakdown, fabric, weight, sleeveType |
| `frontend/src/components/materials/DTFForm.tsx` | DTF_TRANSFERS | transferType, sheetSize, width, height, filmType, finish, whiteInkBase, designReference, designsPerSheet |
| `frontend/src/components/materials/HTVForm.tsx` | HTV_VINYL | brand, productLine, color, size, vinylType, pressTemp, pressTime |
| `frontend/src/components/materials/SupplyForm.tsx` | SUPPLIES | supplyCategory, itemId, variantId, color, type |

The orchestrating component `frontend/src/components/materials/MaterialSelector.tsx` (lines 82–93) shows a category picker first, and only renders the item browser after a category is selected. However, `MaterialSelector` does NOT render any of the four specialized forms (GarmentForm, DTFForm, HTVForm, SupplyForm) — it only browses existing inventory items. The specialized forms are standalone and are used elsewhere (e.g., in order workflows).

**There is no cross-contamination in these four form components.** A garment form never renders DTF fields and vice versa. The cascading dependency logic (brand → style → color → size) is category-specific and sourced from separate catalog constant files:
- `frontend/src/constants/productCatalog.ts` (garments)
- `frontend/src/constants/dtfCatalog.ts` (DTF)
- `frontend/src/constants/htvCatalog.ts` (HTV)
- `frontend/src/constants/suppliesCatalog.ts` (supplies)

---

### 1B. Order Item Editor (components/orders/OrderItemsEditor.tsx)

**Verdict: PARTIAL — Category-conditional fields exist but with reduced specificity.**

`frontend/src/components/orders/OrderItemsEditor.tsx` (lines 17–41) defines a `CATEGORY_FIELDS` config map with isolated field lists per category:

```typescript
const CATEGORY_FIELDS: Record<string, ...> = {
  BLANK_GARMENTS: [ brand, style, color, size, sleeveType ],
  DTF_TRANSFERS:  [ filmType, dimensions, sheetType ],
  HTV_VINYL:      [ brand, color, materialType, width ],
  SUPPLIES:       [ supplier, packagingType, quantityUnit ],
};
```

These fields only render when a category is selected (line 198: `{category && CATEGORY_FIELDS[category] && ...}`). This is correct conditional rendering.

**Gap:** These are lightweight free-text/select fields, not the rich cascading forms from `components/materials/`. A user ordering garments sees only a plain text "brand" field instead of the full catalog-driven Brand → Style → Color → Size cascade. The sophisticated `GarmentForm`, `DTFForm`, `HTVForm`, and `SupplyForm` components are not wired into the order item editor — the order editor has its own simpler parallel field system.

---

### 1C. Inventory Item Create/Edit Form (pages/inventory/AddEditInventory.tsx)

**Verdict: MISSING — The create/edit inventory form has NO category-conditional fields.**

`frontend/src/pages/inventory/AddEditInventory.tsx` (lines 236–257) renders three universal attribute fields — Brand, Size, Color — for ALL categories regardless of selection:

```tsx
// Lines 239–257 — rendered for every category with no conditional logic
<TouchInput label="Brand" ... />
<TouchInput label="Size"  ... />
<TouchInput label="Color" ... />
```

- A DTF Transfer inventory item shows garment-style Brand/Size/Color fields.
- An HTV Vinyl inventory item shows the same Brand/Size/Color as a garment.
- There is no conditional rendering based on the selected category value.
- DTF-specific fields (filmType, sheetSize, dimensions) are completely absent from this form.
- HTV-specific fields (vinylType, pressTemp, pressTime, rollSize) are completely absent.

The "Use Catalog" button does pre-fill values via `handleMaterialSelect` (lines 117–125), which extracts category-specific data from the catalog forms. But when manually creating or editing an item, the user only sees generic Brand/Size/Color regardless of category.

**Evidence:**
- `AddEditInventory.tsx:204–257` — "Attributes" section has no `watch('category')` conditional
- `AddEditInventory.tsx:23–35` — Zod schema (`addEditSchema`) has no category-conditional field validation; it is a flat schema with optional brand, size, color for all categories

---

### 1D. Backend Zod Validators

**Verdict: MISSING — No category-conditional validation on the backend.**

`backend/src/validators/inventory.ts` (lines 7–27):

```typescript
export const createInventoryItemSchema = z.object({
  category: z.nativeEnum(InventoryCategory),
  brand:    z.string().max(100).optional(),
  size:     z.string().max(50).optional(),
  color:    z.string().max(50).optional(),
  // ... no category-conditional branches
});
```

The schema accepts the same flat fields for every category. There are no `z.discriminatedUnion` or `.superRefine` branches that enforce "if category is DTF_TRANSFERS, filmType is required." Category-specific metadata (filmType, sheetSize, vinylType, rollSize, pressTemp, etc.) has no validation pathway on the backend.

---

### 1E. Database Schema

**Verdict: PARTIAL — `attributes Json` field exists on related models but not on InventoryItem itself.**

`backend/prisma/schema.prisma` — `InventoryItem` model (lines 159–187):

```prisma
model InventoryItem {
  sku       String
  name      String
  category  InventoryCategory
  brand     String?
  size      String?
  color     String?
  costPrice Decimal
  notes     String?
  // NO attributes Json field here
}
```

The `InventoryItem` table has only flat, generic columns. There is no `attributes Json` field to store category-specific metadata.

By contrast, `OrderItem` (line 149) and `RequiredMaterial` (line 335) both have `attributes Json @default("{}")` — a flexible JSON escape hatch that CAN store category-specific data at the order level.

Category-specific metadata (filmType, vinylType, pressTemp, rollSize, sheetSize, etc.) written by GarmentForm/DTFForm/HTVForm to order line items gets stored in `OrderItem.attributes`. But when those same items exist in `InventoryItem`, none of that metadata persists — it is silently discarded.

---

### 1F. Category Enum Mismatch (CRITICAL BUG)

**Verdict: BUG — `SUPPLIES` is not a valid `InventoryCategory` enum value.**

The Prisma enum (schema.prisma, line 518–526) defines:
```
BLANK_SHIRTS, DTF_TRANSFERS, VINYL, INK, PACKAGING, EMBROIDERY_THREAD, OTHER
```

The following frontend files use `"SUPPLIES"` as a category value:
- `frontend/src/pages/inventory/AddEditInventory.tsx:221` — `<option value="SUPPLIES">Supplies</option>`
- `frontend/src/components/orders/OrderItemsEditor.tsx:36,47` — `SUPPLIES` key in CATEGORY_FIELDS and CATEGORIES array
- `frontend/src/components/materials/SupplyForm.tsx:57` — `category: 'SUPPLIES'` in onSubmit output

Any API call that sends `category: "SUPPLIES"` will fail backend validation with a Prisma enum error because `SUPPLIES` does not exist in `InventoryCategory`. The correct value would be `OTHER` or a new enum member.

Additionally, `MaterialSelector.tsx` shows 7 categories (`BLANK_SHIRTS`, `DTF_TRANSFERS`, `VINYL`, `INK`, `PACKAGING`, `EMBROIDERY_THREAD`, `OTHER`) while `AddEditInventory.tsx` shows only 4 (`BLANK_SHIRTS`, `DTF_TRANSFERS`, `VINYL`, `SUPPLIES`). These two views are not synchronized.

---

### 1G. `useState` Missing Import (COMPILE BUG)

`frontend/src/pages/inventory/AddEditInventory.tsx` line 1 imports only `{ useEffect }` from React, but line 53 calls `useState(false)`. This file will not compile until `useState` is added to the import.

---

### Section 1 Summary

| Area | Status |
|---|---|
| Category form components (GarmentForm, DTFForm, HTVForm, SupplyForm) | IMPLEMENTED |
| Order item editor conditional fields | PARTIAL |
| Inventory create/edit form conditional fields | MISSING |
| Backend Zod category-conditional validation | MISSING |
| Database category-specific columns | MISSING (JSON escape hatch only on OrderItem) |
| SUPPLIES enum value | BUG — does not exist in backend enum |
| `useState` import in AddEditInventory | BUG — compile error |

---

## Section 2: Overall Project Alignment

### Clerk Auth Integration

**Status: IMPLEMENTED**

- `@clerk/express` is used in the backend: `backend/src/middleware/auth.ts` wraps `clerkMiddleware()` and `requireAuth()` checks `auth.userId` and `auth.orgId`.
- `@clerk/clerk-react` is used in the frontend: `ClerkProvider` wraps the app in `frontend/src/main.tsx`.
- Token sync loop (`TokenSync` component in `main.tsx` lines 21–48) refreshes the Clerk token every 55 seconds and sets it on the axios instance.
- `AuthSync` component at `frontend/src/components/auth/AuthSync.tsx` exists for additional sync.
- Tenant injection (`backend/src/middleware/tenant.ts`) upserts an `Organization` row on first API call using `clerkOrgId`, establishing the multi-tenant DB link automatically.

**Gap:** The `injectTenant` middleware creates organizations with the Clerk org ID as both `name` and `slug` (placeholder). Real org names require the settings page to be used after signup. There is no post-signup onboarding flow that prompts for org name.

---

### Multi-Tenant Isolation (organizationId)

**Status: IMPLEMENTED on backend, UNTESTED on frontend**

Every backend service (`inventoryService.ts`, `orderService.ts`, `customerService.ts`, etc.) takes `organizationId` as a parameter and scopes all queries with it. Cross-org access is explicitly checked (e.g., `inventoryService.ts:101` — `if (item.organizationId !== organizationId) throw 403`).

All Prisma models include `organizationId String` with `@@index([organizationId])` and `onDelete: Cascade` from Organization.

**Gap:** Frontend API calls do not pass an `organizationId` header or parameter — they rely entirely on the Clerk JWT's `org_id` claim being resolved server-side by `injectTenant`. If the Clerk token does not carry the org claim (e.g., user not in an org), all API calls return 403. There is no frontend guard that warns the user to join or create an organization before using the app.

---

### Offline-First PWA

**Status: PARTIAL**

What is implemented:
- Vite PWA plugin configured in `frontend/vite.config.ts` with `autoUpdate` service worker and `NetworkFirst` API caching (5-minute TTL, 100-entry cache).
- `offlineSync` service (`frontend/src/services/offlineSync.ts`) queues POST/PUT/PATCH/DELETE mutations in IndexedDB using the `idb` library when offline.
- Online/offline state tracked in `useOfflineStore` (`frontend/src/store/offlineStore.ts`).
- Axios interceptor (`frontend/src/lib/api.ts` lines 48–79) detects offline state and enqueues mutations automatically.
- Queue drains on the `window.online` event.

**Gaps:**
1. **Token retrieval for sync is broken.** `offlineSync.ts:83` reads the token from `localStorage.getItem('clerk_token')`. Clerk does not store tokens under this key by default — the key is implementation-specific and almost certainly wrong. Synced mutations after reconnect will likely send requests with no auth token, resulting in 401 rejections and the mutation being silently dropped after 5 retries.
2. **No offline read capability.** The service worker uses `NetworkFirst` which means all reads fall back to cache only if the network fails. There is no explicit offline data snapshot / read-through for inventory, orders, or customers. The app is mutation-queue-only offline, not full read-write offline.
3. **PWA icons missing.** `vite.config.ts` references `icon.svg` as the sole PWA icon. No 192×192 or 512×512 PNG icons are present in `frontend/public/`. This will cause PWA install prompts to show broken icons and may fail Lighthouse PWA audit.

---

### Stripe Billing Integration

**Status: NOT IMPLEMENTED**

- `stripe` package (`^17.0.0`) is listed in `backend/package.json` but there are no Stripe-related source files in `backend/src/`.
- No webhook handler, no subscription creation endpoint, no billing portal route.
- `frontend/src/pages/settings/Settings.tsx` shows Stripe as `status: 'coming_soon'`.
- `Organization` model has `stripeCustomerId`, `stripeSubscriptionId`, `subscriptionStatus`, and `plan` fields in the schema — the data model is ready but no business logic is wired.
- Plan limits (`maxUsers`, `maxOrders`, `maxInventoryItems`) exist in the schema but there is no enforcement middleware checking these limits before allowing creates.

---

### Socket.IO Real-Time

**Status: IMPLEMENTED — basic emit/subscribe, not full coverage**

What is implemented:
- Backend `emitToOrg` (`backend/src/lib/socket.ts:31`) emits to `org:<orgId>` rooms for tenant-isolated delivery.
- Low-stock alerts and inventory adjustments emit from `inventoryService.ts`.
- Frontend subscribes to `order:created`, `order:updated`, `order:status-changed`, `inventory:low-stock`, `inventory:adjusted`, `po:received`, `shipment:updated` via `frontend/src/services/socket.ts`.

**Gaps:**
1. **Backend socket auth is missing.** The frontend sends a Clerk token in `socket.io` `auth: { token }` (`socket.ts:24`), but the backend (`backend/src/index.ts`) does not show a `io.use(middleware)` that verifies this token and places sockets into `org:<orgId>` rooms. Without this, every socket receives every org's events — a multi-tenant security leak.
2. **No room join logic found.** `emitToOrg` emits to `org:<orgId>` rooms, but there is no code path that calls `socket.join('org:<orgId>')` when a client connects. Events emitted to the room will reach nobody unless sockets have joined it.

---

### Touch Targets ≥ 44px

**Status: MOSTLY COMPLIANT — isolated violations exist**

Core UI components use `min-h-[44px]` consistently:
- `TouchButton` component enforces touch-safe sizing.
- `CascadingSelect` uses `min-h-[48px]` (line 32 in CascadingSelect.tsx).
- Order item editor trash button: `min-h-[44px] min-w-[44px]` (OrderItemsEditor.tsx:156).

**Violations found:**
- `frontend/src/components/materials/GarmentForm.tsx:170,178` — Size type toggle buttons use `py-2` only (no min-h) which may render below 44px on some devices.
- `frontend/src/components/materials/DTFForm.tsx:88,143,160` — Transfer type, film type, and finish toggle buttons use `py-2` only, no `min-h-[44px]`.
- `frontend/src/components/materials/HTVForm.tsx` — Not checked inline but uses same pattern as DTFForm.

---

## Section 3: Critical Issues

### CRITICAL-1: `SUPPLIES` enum does not exist in the database

**Files:** `frontend/src/pages/inventory/AddEditInventory.tsx:221`, `frontend/src/components/orders/OrderItemsEditor.tsx:47`, `frontend/src/components/materials/SupplyForm.tsx:57`

Any attempt to create an inventory item with category `"SUPPLIES"` or an order item with `productType: "SUPPLIES"` will throw a Prisma validation error at the backend. This silently blocks all supply-category inventory creation. The enum value that most closely matches intended use is `OTHER`, but the intent was likely to add `SUPPLIES` as its own enum member.

---

### CRITICAL-2: `useState` not imported in `AddEditInventory.tsx`

**File:** `frontend/src/pages/inventory/AddEditInventory.tsx:1,53`

Line 1 imports only `{ useEffect }` from React. Line 53 calls `useState(false)`. This is a TypeScript compile error — the Inventory Add/Edit page will not build or render.

---

### CRITICAL-3: Offline sync token lookup will fail

**File:** `frontend/src/services/offlineSync.ts:83`

```typescript
const token = localStorage.getItem('clerk_token'); // "Adjust based on where token is stored"
```

Clerk does not write to `localStorage` under the key `clerk_token`. The comment acknowledges this is unresolved. All queued mutations that attempt to sync after reconnect will fire with `Authorization: undefined`, receive 401 responses, exhaust their 5 retry attempts, and be silently discarded. Offline mutations will never actually sync.

---

### CRITICAL-4: Socket.IO rooms — no join logic, potential cross-tenant data leak

**Files:** `backend/src/lib/socket.ts`, `backend/src/index.ts`, `frontend/src/services/socket.ts`

The backend emits real-time events to `org:<orgId>` rooms, but there is no socket middleware that (a) verifies the incoming Clerk token and (b) calls `socket.join('org:<orgId>')`. Without room membership, no client receives any real-time events. More critically, if room join logic is added later without token verification, all clients would be in the same room and receive other tenants' data.

---

### CRITICAL-5: Stripe billing plan limits not enforced

**Files:** `backend/prisma/schema.prisma:21–24` (maxUsers, maxOrders, maxInventoryItems), `backend/src/services/`

The Organization model has plan limit fields, but no service or middleware checks these limits before allowing record creation. A free-plan organization could create unlimited orders and inventory items. This needs a guard in `createOrder`, `createInventoryItem`, etc.

---

## Section 4: Recommendations (Prioritized)

### Priority 1 — Fix Compile Bugs (Blocking)

1. **Add `useState` to import** in `frontend/src/pages/inventory/AddEditInventory.tsx` line 1:
   Change `import React, { useEffect }` to `import React, { useEffect, useState }`.

2. **Fix the `SUPPLIES` enum mismatch.** Choose one of:
   - Add `SUPPLIES` to the `InventoryCategory` enum in `backend/prisma/schema.prisma` and run a migration, OR
   - Change all frontend references from `"SUPPLIES"` to `"OTHER"`.
   Affected files: `AddEditInventory.tsx:221`, `OrderItemsEditor.tsx:36,47`, `SupplyForm.tsx:57`.

3. **Synchronize category options** between `MaterialSelector.tsx` (7 categories) and `AddEditInventory.tsx` (4 categories). They should show the same set.

---

### Priority 2 — Fix Offline Sync Token (Data Loss Risk)

4. **Fix offline token retrieval** in `frontend/src/services/offlineSync.ts:83`. Replace `localStorage.getItem('clerk_token')` with a call to the in-memory token held by `frontend/src/lib/api.ts` (the `clerkToken` variable exposed via a getter function). This ensures queued mutations retry with a valid auth token.

---

### Priority 3 — Fix Socket.IO Room Logic (Security + Functionality)

5. **Add socket middleware in the backend** (`backend/src/index.ts`) that:
   - Verifies the incoming Clerk token from `socket.handshake.auth.token`.
   - Extracts `orgId` from the token.
   - Calls `socket.join('org:<orgId>')` to place the socket in the correct tenant room.
   Without this, real-time events never reach clients and tenant isolation is not enforced.

---

### Priority 4 — Add Category-Conditional Fields to Inventory Form

6. **Wire category-specific forms into `AddEditInventory.tsx`.** The `watch('category')` value should conditionally render either a simplified inline version or embed `GarmentForm`/`DTFForm`/`HTVForm`/`SupplyForm` logic. At minimum, the "Attributes" section (lines 236–258) should replace the generic Brand/Size/Color fields with category-appropriate ones.

7. **Add `attributes Json @default("{}")` to `InventoryItem`** in `backend/prisma/schema.prisma`. This mirrors the pattern already used on `OrderItem` and `RequiredMaterial` and allows DTF/HTV-specific metadata to be stored against inventory records.

8. **Add category-conditional Zod validation** to `backend/src/validators/inventory.ts` using `z.discriminatedUnion` on `category`, enforcing required fields per category type.

---

### Priority 5 — Stripe Billing Enforcement

9. **Implement plan limit guards.** Add a middleware or service helper that reads `organization.maxOrders`, `organization.maxInventoryItems` before create operations. Without this, the FREE plan tier is unenforced.

10. **Implement Stripe webhook handler** at a new route (e.g., `backend/src/routes/billing.ts`) to update `subscriptionStatus` and `plan` when Stripe sends subscription lifecycle events. The `stripe` package is already installed.

---

### Priority 6 — Offline PWA Polish

11. **Add PWA icons.** Create 192×192 and 512×512 PNG icon files in `frontend/public/` and reference them in the `vite.config.ts` manifest. The current sole icon (`icon.svg`) may not satisfy all PWA install requirements.

12. **Consider offline read caching.** The current `NetworkFirst` strategy serves reads from cache only on network failure. For a true offline-first experience, pre-cache a snapshot of inventory and recent orders on login using `idb` so the POS terminal works without network access.

---

*Concerns audit: 2026-04-16*
