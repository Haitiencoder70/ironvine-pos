# Frontend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the existing frontend foundation files up to spec — correct TypeScript types, complete API service layer, fix socket subscriptions, and add the missing authStore.

**Architecture:** The frontend uses `frontend/src/lib/api.ts` as the canonical Axios instance (with `setApiToken` used by `main.tsx`). The `frontend/src/services/api.ts` file currently has its own Axios instance that doesn't use the `lib/api.ts` token — it should be refactored to import `api` from `lib/api.ts` instead. All type definitions live in `frontend/src/types/index.ts`. Socket subscriptions live in `frontend/src/services/socket.ts`. Zustand stores live in `frontend/src/store/`.

**Tech Stack:** React 18, TypeScript strict, Zustand, Axios, Socket.IO client, `@clerk/clerk-react`, `vite-plugin-pwa`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/types/index.ts` | Modify | Add missing enum values and interfaces |
| `frontend/src/services/api.ts` | Modify | Use `lib/api.ts` instance; add all missing API methods |
| `frontend/src/services/socket.ts` | Modify | Remove `console.log`; add 4 missing events |
| `frontend/src/store/authStore.ts` | Create | Zustand store for Clerk user + org state |

---

### Task 1: Fix `frontend/src/types/index.ts`

**Files:**
- Modify: `frontend/src/types/index.ts`

**Context:**
- `OrderStatus` is missing `PENDING_APPROVAL` and `ON_HOLD` (both in Prisma schema at lines 26 and 37 of `schema.prisma`)
- `PrintMethod` is missing `DTG` (in Prisma schema at line 52)
- `PurchaseOrder.totalAmount` must be renamed to `total` (Prisma schema field is `total Decimal`, line 411)
- Missing interfaces: `WorkflowStep`, `OrderWorkflow`, `MaterialUsage`, `StockMovement`

- [ ] **Step 1: Add missing enum values to `OrderStatus`**

In `frontend/src/types/index.ts` at line 20, change:
```typescript
export type OrderStatus =
  | 'QUOTE'
  | 'APPROVED'
  | 'MATERIALS_ORDERED'
  | 'MATERIALS_RECEIVED'
  | 'IN_PRODUCTION'
  | 'QUALITY_CHECK'
  | 'READY_TO_SHIP'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';
```
To:
```typescript
export type OrderStatus =
  | 'QUOTE'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'MATERIALS_ORDERED'
  | 'MATERIALS_RECEIVED'
  | 'IN_PRODUCTION'
  | 'QUALITY_CHECK'
  | 'READY_TO_SHIP'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'ON_HOLD'
  | 'CANCELLED';
```

- [ ] **Step 2: Add `DTG` to `PrintMethod`**

Change line 33:
```typescript
export type PrintMethod = 'DTF' | 'HTV' | 'SCREEN_PRINT' | 'EMBROIDERY' | 'SUBLIMATION';
```
To:
```typescript
export type PrintMethod = 'DTF' | 'HTV' | 'SCREEN_PRINT' | 'EMBROIDERY' | 'SUBLIMATION' | 'DTG';
```

- [ ] **Step 3: Rename `PurchaseOrder.totalAmount` to `total`**

In the `PurchaseOrder` interface (line 155), change:
```typescript
  totalAmount: number;
```
To:
```typescript
  total: number;
  subtotal: number;
  taxAmount: number;
```

Also add the `quantityRecv` field to `POItem` (line 161–168):
```typescript
export interface POItem {
  id: string;
  inventoryItemId?: string;
  description: string;
  quantity: number;
  quantityRecv: number;
  unitCost: number;
  totalCost: number;
}
```

- [ ] **Step 4: Add missing interfaces after line 215 (end of file)**

Append:
```typescript
export interface WorkflowStep {
  status: OrderStatus;
  label: string;
  completed: boolean;
  current: boolean;
}

export interface OrderWorkflow {
  steps: WorkflowStep[];
  currentIndex: number;
  canAdvance: boolean;
  nextStatus: OrderStatus | null;
}

export interface MaterialUsage {
  id: string;
  orderId: string;
  inventoryItemId: string;
  inventoryItem?: InventoryItem;
  quantityUsed: number;
  usedAt: string;
  performedBy: string;
}

export interface StockMovement {
  id: string;
  inventoryItemId: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RESERVED' | 'UNRESERVED';
  quantity: number;
  reason: string;
  referenceId?: string;
  referenceType?: string;
  createdAt: string;
}

export interface DashboardStats {
  ordersToday: number;
  inProduction: number;
  readyToShip: number;
  revenueToday: number;
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "fix(frontend): add missing enum values and interfaces to types/index.ts"
```

---

### Task 2: Refactor `frontend/src/services/api.ts` to use canonical Axios instance and add missing methods

**Files:**
- Modify: `frontend/src/services/api.ts`

**Context:**
- `main.tsx` imports `setApiToken` from `lib/api.ts` and calls it every 55 seconds with the refreshed Clerk token
- `services/api.ts` currently creates its own `axios.create()` — this means it misses token updates
- Fix: import `api` from `../lib/api` instead; remove the `api` creation block and the local interceptor
- Missing methods to add:
  - `orderApi.update(id, data)` → `PATCH /orders/:id`
  - `orderApi.getWorkflow(id)` → `GET /orders/:id/workflow`
  - `inventoryApi.update(id, data)` → `PATCH /inventory/:id`
  - `inventoryApi.delete(id)` → `DELETE /inventory/:id`
  - `inventoryApi.getLowStock()` → `GET /inventory/low-stock`
  - `inventoryApi.getStockMovements(id)` → `GET /inventory/:id/movements`
  - `customerApi.delete(id)` → `DELETE /customers/:id`
  - `customerApi.getOrderHistory(id)` → `GET /customers/:id/orders`
  - `purchaseOrderApi.getByOrder(orderId)` → `GET /purchase-orders/by-order/:orderId`
  - `purchaseOrderApi.updateStatus(id, data)` → `PATCH /purchase-orders/:id/status`
  - `purchaseOrderApi.send(id)` → `POST /purchase-orders/:id/send`
  - `vendorApi.delete(id)` → `DELETE /vendors/:id`
  - `dashboardApi.getOrdersByStatus()` → `GET /dashboard/orders-by-status`

- [ ] **Step 1: Replace the entire file content**

Write `frontend/src/services/api.ts` as:

```typescript
import { api } from '../lib/api';
import {
  Order,
  InventoryItem,
  Customer,
  PurchaseOrder,
  Vendor,
  Shipment,
  ApiResponse,
  PaginatedResult,
  OrderWorkflow,
  StockMovement,
  DashboardStats,
} from '../types';

// ─── Orders ───────────────────────────────────────────────────────────────────

export const orderApi = {
  getAll: (params?: unknown) =>
    api.get<ApiResponse<PaginatedResult<Order>>>('/orders', { params }).then((r) => r.data),
  getById: (id: string) =>
    api.get<ApiResponse<Order>>(`/orders/${id}`).then((r) => r.data),
  create: (data: unknown) =>
    api.post<ApiResponse<Order>>('/orders', data).then((r) => r.data),
  update: (id: string, data: unknown) =>
    api.patch<ApiResponse<Order>>(`/orders/${id}`, data).then((r) => r.data),
  updateStatus: (id: string, data: { newStatus: string; notes?: string }) =>
    api.patch<ApiResponse<Order>>(`/orders/${id}/status`, data).then((r) => r.data),
  useMaterials: (id: string, materials: { inventoryItemId: string; quantityUsed: number }[]) =>
    api.post<ApiResponse<null>>(`/orders/${id}/use-materials`, { materials }).then((r) => r.data),
  getWorkflow: (id: string) =>
    api.get<ApiResponse<OrderWorkflow>>(`/orders/${id}/workflow`).then((r) => r.data),
};

// ─── Inventory ────────────────────────────────────────────────────────────────

export const inventoryApi = {
  getAll: (params?: unknown) =>
    api.get<ApiResponse<PaginatedResult<InventoryItem>>>('/inventory', { params }).then((r) => r.data),
  getById: (id: string) =>
    api.get<ApiResponse<InventoryItem>>(`/inventory/${id}`).then((r) => r.data),
  create: (data: unknown) =>
    api.post<ApiResponse<InventoryItem>>('/inventory', data).then((r) => r.data),
  update: (id: string, data: unknown) =>
    api.patch<ApiResponse<InventoryItem>>(`/inventory/${id}`, data).then((r) => r.data),
  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/inventory/${id}`).then((r) => r.data),
  adjustStock: (id: string, data: unknown) =>
    api.patch<ApiResponse<InventoryItem>>(`/inventory/${id}/adjust`, data).then((r) => r.data),
  getLowStock: () =>
    api.get<ApiResponse<InventoryItem[]>>('/inventory/low-stock').then((r) => r.data),
  getStockMovements: (id: string) =>
    api.get<ApiResponse<StockMovement[]>>(`/inventory/${id}/movements`).then((r) => r.data),
};

// ─── Customers ────────────────────────────────────────────────────────────────

export const customerApi = {
  getAll: (params?: unknown) =>
    api.get<ApiResponse<PaginatedResult<Customer>>>('/customers', { params }).then((r) => r.data),
  getById: (id: string) =>
    api.get<ApiResponse<Customer>>(`/customers/${id}`).then((r) => r.data),
  create: (data: unknown) =>
    api.post<ApiResponse<Customer>>('/customers', data).then((r) => r.data),
  update: (id: string, data: unknown) =>
    api.patch<ApiResponse<Customer>>(`/customers/${id}`, data).then((r) => r.data),
  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/customers/${id}`).then((r) => r.data),
  getOrderHistory: (id: string) =>
    api.get<ApiResponse<Order[]>>(`/customers/${id}/orders`).then((r) => r.data),
};

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export const purchaseOrderApi = {
  getAll: (params?: unknown) =>
    api.get<ApiResponse<PaginatedResult<PurchaseOrder>>>('/purchase-orders', { params }).then((r) => r.data),
  getById: (id: string) =>
    api.get<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}`).then((r) => r.data),
  getByOrder: (orderId: string) =>
    api.get<ApiResponse<PurchaseOrder[]>>(`/purchase-orders/by-order/${orderId}`).then((r) => r.data),
  create: (data: unknown) =>
    api.post<ApiResponse<PurchaseOrder>>('/purchase-orders', data).then((r) => r.data),
  receive: (id: string, data: unknown) =>
    api.patch<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}/receive`, data).then((r) => r.data),
  updateStatus: (id: string, data: { newStatus: string; notes?: string }) =>
    api.patch<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}/status`, data).then((r) => r.data),
  send: (id: string) =>
    api.post<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}/send`).then((r) => r.data),
};

// ─── Vendors ──────────────────────────────────────────────────────────────────

export const vendorApi = {
  getAll: (params?: unknown) =>
    api.get<ApiResponse<PaginatedResult<Vendor>>>('/vendors', { params }).then((r) => r.data),
  getById: (id: string) =>
    api.get<ApiResponse<Vendor>>(`/vendors/${id}`).then((r) => r.data),
  create: (data: unknown) =>
    api.post<ApiResponse<Vendor>>('/vendors', data).then((r) => r.data),
  update: (id: string, data: unknown) =>
    api.patch<ApiResponse<Vendor>>(`/vendors/${id}`, data).then((r) => r.data),
  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/vendors/${id}`).then((r) => r.data),
};

// ─── Shipments ────────────────────────────────────────────────────────────────

export const shipmentApi = {
  getAll: (params?: unknown) =>
    api.get<ApiResponse<PaginatedResult<Shipment>>>('/shipments', { params }).then((r) => r.data),
  getById: (id: string) =>
    api.get<ApiResponse<Shipment>>(`/shipments/${id}`).then((r) => r.data),
  create: (data: unknown) =>
    api.post<ApiResponse<Shipment>>('/shipments', data).then((r) => r.data),
  updateStatus: (id: string, data: unknown) =>
    api.patch<ApiResponse<Shipment>>(`/shipments/${id}/status`, data).then((r) => r.data),
  updateTracking: (id: string, data: unknown) =>
    api.patch<ApiResponse<Shipment>>(`/shipments/${id}/tracking`, data).then((r) => r.data),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getStats: () =>
    api.get<ApiResponse<DashboardStats>>('/dashboard/stats').then((r) => r.data),
  getRecentOrders: () =>
    api.get<ApiResponse<Order[]>>('/dashboard/recent-orders').then((r) => r.data),
  getLowStockAlerts: () =>
    api.get<ApiResponse<InventoryItem[]>>('/dashboard/low-stock').then((r) => r.data),
  getPendingPOs: () =>
    api.get<ApiResponse<PurchaseOrder[]>>('/dashboard/pending-pos').then((r) => r.data),
  getOrdersByStatus: () =>
    api.get<ApiResponse<{ status: string; count: number }[]>>('/dashboard/orders-by-status').then((r) => r.data),
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/api.ts
git commit -m "fix(frontend): consolidate api service to use lib/api instance and add missing methods"
```

---

### Task 3: Fix `frontend/src/services/socket.ts`

**Files:**
- Modify: `frontend/src/services/socket.ts`

**Context:**
- Two `console.log` calls on lines 21 and 25 violate the no-console rule
- Missing socket events: `order:materials-used`, `inventory:adjusted`, `po:received`, `shipment:updated`
- Replace `console.log` with a no-op (browser has no Winston; just remove the logging or keep it silent — use `import.meta.env.DEV` guard if you want dev-only logging)

- [ ] **Step 1: Replace the entire file content**

Write `frontend/src/services/socket.ts` as:

```typescript
import { io, Socket } from 'socket.io-client';
import { Order, InventoryItem, PurchaseOrder, Shipment } from '../types';

let socket: Socket | null = null;

export const initSocket = async (getToken: () => Promise<string | null>): Promise<Socket> => {
  if (socket?.connected) {
    return socket;
  }

  const token = await getToken();
  if (!token) {
    throw new Error('Socket initialization failed: No auth token available.');
  }

  socket = io(import.meta.env['VITE_API_URL']?.replace('/api', '') ?? 'http://localhost:3001', {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[socket] connected');
    }
  });

  socket.on('disconnect', (reason) => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug(`[socket] disconnected: ${reason}`);
    }
  });

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const subscribeToOrders = (callbacks: {
  onCreated?: (order: Order) => void;
  onUpdated?: (order: Order) => void;
  onStatusChanged?: (order: Order) => void;
  onMaterialsUsed?: (data: { orderId: string }) => void;
}): (() => void) => {
  if (!socket) return () => {};

  const { onCreated, onUpdated, onStatusChanged, onMaterialsUsed } = callbacks;

  if (onCreated) socket.on('order:created', onCreated);
  if (onUpdated) socket.on('order:updated', onUpdated);
  if (onStatusChanged) socket.on('order:status-changed', onStatusChanged);
  if (onMaterialsUsed) socket.on('order:materials-used', onMaterialsUsed);

  return () => {
    if (!socket) return;
    if (onCreated) socket.off('order:created', onCreated);
    if (onUpdated) socket.off('order:updated', onUpdated);
    if (onStatusChanged) socket.off('order:status-changed', onStatusChanged);
    if (onMaterialsUsed) socket.off('order:materials-used', onMaterialsUsed);
  };
};

export const subscribeToInventory = (callbacks: {
  onLowStock?: (item: InventoryItem) => void;
  onAdjusted?: (item: InventoryItem) => void;
}): (() => void) => {
  if (!socket) return () => {};

  const { onLowStock, onAdjusted } = callbacks;

  if (onLowStock) socket.on('inventory:low-stock', onLowStock);
  if (onAdjusted) socket.on('inventory:adjusted', onAdjusted);

  return () => {
    if (!socket) return;
    if (onLowStock) socket.off('inventory:low-stock', onLowStock);
    if (onAdjusted) socket.off('inventory:adjusted', onAdjusted);
  };
};

export const subscribeToPurchaseOrders = (callbacks: {
  onReceived?: (po: PurchaseOrder) => void;
}): (() => void) => {
  if (!socket) return () => {};

  const { onReceived } = callbacks;

  if (onReceived) socket.on('po:received', onReceived);

  return () => {
    if (!socket) return;
    if (onReceived) socket.off('po:received', onReceived);
  };
};

export const subscribeToShipments = (callbacks: {
  onUpdated?: (shipment: Shipment) => void;
}): (() => void) => {
  if (!socket) return () => {};

  const { onUpdated } = callbacks;

  if (onUpdated) socket.on('shipment:updated', onUpdated);

  return () => {
    if (!socket) return;
    if (onUpdated) socket.off('shipment:updated', onUpdated);
  };
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/socket.ts
git commit -m "fix(frontend): remove console.log violations and add missing socket event subscriptions"
```

---

### Task 4: Create `frontend/src/store/authStore.ts`

**Files:**
- Create: `frontend/src/store/authStore.ts`

**Context:**
- `main.tsx` already handles token refresh via `TokenSync` component and `setApiToken` — the authStore does NOT manage tokens
- The authStore surfaces Clerk user + active organization info for use in components (e.g., showing user name in TopBar, checking role for permission gates)
- Use `useUser` and `useOrganization` from `@clerk/clerk-react` — the store is populated by a sync component that calls these hooks
- The store holds the resolved `User` and `Organization` shapes from `types/index.ts`

- [ ] **Step 1: Create the file**

Write `frontend/src/store/authStore.ts` as:

```typescript
import { create } from 'zustand';
import { User, Organization } from '../types';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  setUser: (user: User | null) => void;
  setOrganization: (org: Organization | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  organization: null,
  setUser: (user) => set({ user }),
  setOrganization: (org) => set({ organization: org }),
}));
```

- [ ] **Step 2: Create `frontend/src/components/auth/AuthSync.tsx` to populate the store**

This component uses Clerk hooks (which require React context) to sync data into the store. It lives in a component so hooks can be called inside the component tree.

Write `frontend/src/components/auth/AuthSync.tsx` as:

```typescript
import { useEffect } from 'react';
import { useUser, useOrganization } from '@clerk/clerk-react';
import { useAuthStore } from '../../store/authStore';
import { User, Organization } from '../../types';

export function AuthSync(): null {
  const { user: clerkUser } = useUser();
  const { organization: clerkOrg } = useOrganization();
  const setUser = useAuthStore((s) => s.setUser);
  const setOrganization = useAuthStore((s) => s.setOrganization);

  useEffect(() => {
    if (!clerkUser) {
      setUser(null);
      return;
    }

    const membership = clerkUser.organizationMemberships?.[0];
    const role = (membership?.role === 'org:admin' ? 'OWNER'
      : membership?.role === 'org:manager' ? 'MANAGER'
      : 'STAFF') as User['role'];

    setUser({
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
      firstName: clerkUser.firstName ?? '',
      lastName: clerkUser.lastName ?? '',
      imageUrl: clerkUser.imageUrl,
      organizationId: membership?.organization.id ?? '',
      role,
      isActive: true,
    });
  }, [clerkUser, setUser]);

  useEffect(() => {
    if (!clerkOrg) {
      setOrganization(null);
      return;
    }

    setOrganization({
      id: clerkOrg.id,
      name: clerkOrg.name,
      slug: clerkOrg.slug ?? '',
      plan: (clerkOrg.publicMetadata?.['plan'] as Organization['plan']) ?? 'FREE',
      subscriptionStatus: (clerkOrg.publicMetadata?.['subscriptionStatus'] as string) ?? null,
    });
  }, [clerkOrg, setOrganization]);

  return null;
}
```

- [ ] **Step 3: Add `AuthSync` to `frontend/src/main.tsx`**

In `main.tsx`, add the import after existing imports:
```typescript
import { AuthSync } from './components/auth/AuthSync';
```

And add `<AuthSync />` inside `<ClerkProvider>` after `<TokenSync />`:
```tsx
<ClerkProvider publishableKey={PUBLISHABLE_KEY}>
  <QueryClientProvider client={queryClient}>
    <TokenSync />
    <AuthSync />
    <App />
    ...
  </QueryClientProvider>
</ClerkProvider>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/store/authStore.ts frontend/src/components/auth/AuthSync.tsx frontend/src/main.tsx
git commit -m "feat(frontend): add authStore and AuthSync component to surface Clerk user/org state"
```

---

## Self-Review

### Spec coverage
- ✅ `package.json` — already complete, no changes needed
- ✅ `tailwind.config.ts` — already correct (44px touch targets, custom spacing)
- ✅ `vite.config.ts` — already correct (PWA, proxy to localhost:3001, path alias `@`)
- ✅ `tsconfig.json` — not modified (strict mode already set by scaffold)
- ✅ Types — Task 1 adds all missing values
- ✅ API service — Task 2 fixes axios instance and all missing methods
- ✅ Socket service — Task 3 removes console.log, adds 4 missing events
- ✅ authStore — Task 4 creates store + AuthSync component
- ✅ uiStore — already complete, no changes needed
- ✅ offlineStore — already complete, no changes needed

### Placeholder scan
No TBDs, no "implement later", no partial implementations. Every step contains complete code.

### Type consistency
- `DashboardStats` defined in Task 1 Step 4, used in Task 2 Step 1 ✅
- `OrderWorkflow` defined in Task 1 Step 4, used in Task 2 Step 1 ✅
- `StockMovement` defined in Task 1 Step 4, used in Task 2 Step 1 ✅
- `User['role']` values (`OWNER`, `MANAGER`, `STAFF`) match `types/index.ts` line 16 ✅
- `Organization` shape in AuthSync matches `types/index.ts` lines 1–7 ✅
