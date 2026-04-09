# Dashboard Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Dashboard page with stats grid, recent orders, low-stock alerts, quick actions, React Query data fetching with 30-second auto-refresh, and Socket.IO real-time invalidation.

**Architecture:** Dashboard is split into four focused sub-components in `frontend/src/pages/dashboard/` (StatsGrid, RecentOrders, LowStockAlerts, QuickActions). The parent `Dashboard.tsx` owns all three `useQuery` calls, the socket subscription side-effects, and composes the sub-components via props. Sub-components receive data and loading state as props — they do no fetching themselves. This keeps each file small and testable in isolation.

**Tech Stack:** React 18, TanStack Query v5, react-hot-toast, Socket.IO client (`subscribeToOrders`, `subscribeToInventory`), `date-fns`, `@heroicons/react`, Tailwind CSS, `clsx`, React Router DOM `useNavigate`/`Link`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/pages/dashboard/StatsGrid.tsx` | Create | 4 stat cards — counts + revenue |
| `frontend/src/pages/dashboard/RecentOrders.tsx` | Create | Last 10 orders list with empty state |
| `frontend/src/pages/dashboard/LowStockAlerts.tsx` | Create | Low-stock items list with success state |
| `frontend/src/pages/dashboard/QuickActions.tsx` | Create | 4 large touch-target action buttons |
| `frontend/src/pages/Dashboard.tsx` | Modify | Compose sub-components, queries, socket, toasts |

---

### Task 1: StatsGrid sub-component

**Files:**
- Create: `frontend/src/pages/dashboard/StatsGrid.tsx`

**Context:**
- Receives `stats: DashboardStats | undefined` and `loading: boolean` as props
- 2-column grid on mobile, 4-column on desktop (`grid-cols-2 lg:grid-cols-4`)
- Each card: colored icon background (blue/orange/green/purple), large number, label, navigates on click
- Loading state: skeleton shimmer (animate-pulse gray boxes)
- `DashboardStats` is `{ ordersToday: number; inProduction: number; readyToShip: number; revenueToday: number }` from `frontend/src/types/index.ts`

- [ ] **Step 1: Create `frontend/src/pages/dashboard/StatsGrid.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCartIcon,
  WrenchScrewdriverIcon,
  TruckIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import type { DashboardStats } from '../../types';

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  onClick: () => void;
}

function StatCard({ label, value, icon, iconBg, onClick }: StatCardProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 w-full text-left hover:shadow-md active:scale-[0.98] transition-all duration-150 min-h-[88px]"
    >
      <div className={clsx('flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center', iconBg)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-sm text-gray-500 mt-1 truncate">{label}</p>
      </div>
    </button>
  );
}

function StatCardSkeleton(): React.JSX.Element {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 min-h-[88px] animate-pulse">
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gray-100" />
      <div className="flex-1 space-y-2">
        <div className="h-7 bg-gray-100 rounded w-16" />
        <div className="h-4 bg-gray-100 rounded w-28" />
      </div>
    </div>
  );
}

interface StatsGridProps {
  stats: DashboardStats | undefined;
  loading: boolean;
}

export function StatsGrid({ stats, loading }: StatsGridProps): React.JSX.Element {
  const navigate = useNavigate();

  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
    );
  }

  const cards = [
    {
      label: 'Orders Today',
      value: String(stats?.ordersToday ?? 0),
      icon: <ShoppingCartIcon className="h-6 w-6 text-blue-600" />,
      iconBg: 'bg-blue-50',
      onClick: () => void navigate('/orders'),
    },
    {
      label: 'In Production',
      value: String(stats?.inProduction ?? 0),
      icon: <WrenchScrewdriverIcon className="h-6 w-6 text-orange-600" />,
      iconBg: 'bg-orange-50',
      onClick: () => void navigate('/orders?status=IN_PRODUCTION'),
    },
    {
      label: 'Ready to Ship',
      value: String(stats?.readyToShip ?? 0),
      icon: <TruckIcon className="h-6 w-6 text-green-600" />,
      iconBg: 'bg-green-50',
      onClick: () => void navigate('/orders?status=READY_TO_SHIP'),
    },
    {
      label: "Revenue Today",
      value: formatCurrency(stats?.revenueToday ?? 0),
      icon: <CurrencyDollarIcon className="h-6 w-6 text-purple-600" />,
      iconBg: 'bg-purple-50',
      onClick: () => void navigate('/orders'),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/dashboard/StatsGrid.tsx
git commit -m "feat(dashboard): add StatsGrid sub-component"
```

---

### Task 2: RecentOrders sub-component

**Files:**
- Create: `frontend/src/pages/dashboard/RecentOrders.tsx`

**Context:**
- Receives `orders: Order[] | undefined` and `loading: boolean`
- Shows up to 10 orders, each row: order number, customer full name, `StatusBadge`, relative time via `date-fns formatDistanceToNow`
- Each row clickable → navigate to `/orders/:id`
- "View All Orders" link at bottom → `/orders`
- Empty state: clipboard icon + "No orders yet today"
- Loading state: 5 skeleton rows

- [ ] **Step 1: Create `frontend/src/pages/dashboard/RecentOrders.tsx`**

```tsx
import { useNavigate, Link } from 'react-router-dom';
import { ClipboardDocumentListIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { StatusBadge } from '../../components/ui/StatusBadge';
import type { Order } from '../../types';

interface RecentOrdersProps {
  orders: Order[] | undefined;
  loading: boolean;
}

function SkeletonRow(): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 py-3 px-4 animate-pulse">
      <div className="flex-1 space-y-1.5">
        <div className="h-4 bg-gray-100 rounded w-24" />
        <div className="h-3 bg-gray-100 rounded w-32" />
      </div>
      <div className="h-6 bg-gray-100 rounded-full w-20" />
      <div className="h-3 bg-gray-100 rounded w-16" />
    </div>
  );
}

export function RecentOrders({ orders, loading }: RecentOrdersProps): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Recent Orders</h2>
        <Link
          to="/orders"
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors min-h-[44px] px-2"
        >
          View All
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="divide-y divide-gray-50">
          {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <ClipboardDocumentListIcon className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No orders yet today</p>
          <p className="text-sm text-gray-400 mt-1">Orders will appear here as they come in</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {orders.slice(0, 10).map((order) => {
            const customerName = order.customer
              ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
              : 'Unknown Customer';
            const relativeTime = formatDistanceToNow(new Date(order.createdAt), { addSuffix: true });

            return (
              <button
                key={order.id}
                onClick={() => void navigate(`/orders/${order.id}`)}
                className="w-full flex items-center gap-3 py-3 px-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left min-h-[56px]"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{order.orderNumber}</p>
                  <p className="text-xs text-gray-500 truncate">{customerName}</p>
                </div>
                <StatusBadge status={order.status} size="sm" />
                <p className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0 hidden sm:block">
                  {relativeTime}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/dashboard/RecentOrders.tsx
git commit -m "feat(dashboard): add RecentOrders sub-component"
```

---

### Task 3: LowStockAlerts sub-component

**Files:**
- Create: `frontend/src/pages/dashboard/LowStockAlerts.tsx`

**Context:**
- Receives `items: InventoryItem[] | undefined` and `loading: boolean`
- Each row: item name, SKU, current qty vs reorder point, warning icon
- Amber color scheme on warning rows
- Click → navigate to `/inventory` (no detail page yet)
- Success state when `items.length === 0`: green checkmark + "All stock levels are healthy"
- Loading state: 4 skeleton rows

- [ ] **Step 1: Create `frontend/src/pages/dashboard/LowStockAlerts.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import type { InventoryItem } from '../../types';

interface LowStockAlertsProps {
  items: InventoryItem[] | undefined;
  loading: boolean;
}

function SkeletonRow(): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 py-3 px-4 animate-pulse">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 bg-gray-100 rounded w-32" />
        <div className="h-3 bg-gray-100 rounded w-20" />
      </div>
      <div className="h-5 bg-gray-100 rounded w-16" />
    </div>
  );
}

export function LowStockAlerts({ items, loading }: LowStockAlertsProps): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
        <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0" />
        <h2 className="text-base font-semibold text-gray-900">Low Stock Alerts</h2>
        {!loading && items && items.length > 0 && (
          <span className="ml-auto bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            {items.length}
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="divide-y divide-gray-50">
          {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : !items || items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <CheckCircleIcon className="h-10 w-10 text-green-400 mb-3" />
          <p className="text-gray-700 font-medium">All stock levels are healthy</p>
          <p className="text-sm text-gray-400 mt-1">No items below reorder point</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => void navigate('/inventory')}
              className="w-full flex items-center gap-3 py-3 px-4 hover:bg-amber-50 active:bg-amber-100 transition-colors text-left min-h-[56px]"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <ExclamationTriangleIcon className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                <p className="text-xs text-gray-500 truncate">{item.sku}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-amber-600">{item.quantityOnHand}</p>
                <p className="text-xs text-gray-400">min {item.reorderPoint}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/dashboard/LowStockAlerts.tsx
git commit -m "feat(dashboard): add LowStockAlerts sub-component"
```

---

### Task 4: QuickActions sub-component

**Files:**
- Create: `frontend/src/pages/dashboard/QuickActions.tsx`

**Context:**
- No props — uses `useNavigate` internally
- 4 large touch-target cards in a 2×2 grid (mobile) / 4-column row (desktop)
- Each card: min 120px height, large icon at top, label below, hover + active states
- Colors: New Order (blue), Add Customer (green), Create PO (purple), Check Inventory (amber)

- [ ] **Step 1: Create `frontend/src/pages/dashboard/QuickActions.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import {
  PlusCircleIcon,
  UserPlusIcon,
  DocumentPlusIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface ActionCardProps {
  label: string;
  icon: React.ReactNode;
  colorClasses: string;
  onClick: () => void;
}

function ActionCard({ label, icon, colorClasses, onClick }: ActionCardProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex flex-col items-center justify-center gap-3 rounded-2xl p-5 min-h-[120px] w-full',
        'font-semibold text-sm transition-all duration-150 active:scale-[0.97]',
        colorClasses
      )}
    >
      <div className="h-8 w-8">{icon}</div>
      <span>{label}</span>
    </button>
  );
}

export function QuickActions(): React.JSX.Element {
  const navigate = useNavigate();

  const actions = [
    {
      label: 'New Order',
      icon: <PlusCircleIcon className="h-8 w-8" />,
      colorClasses: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200',
      onClick: () => void navigate('/orders/new'),
    },
    {
      label: 'Add Customer',
      icon: <UserPlusIcon className="h-8 w-8" />,
      colorClasses: 'bg-green-600 text-white hover:bg-green-700 shadow-sm shadow-green-200',
      onClick: () => void navigate('/customers/new'),
    },
    {
      label: 'Create PO',
      icon: <DocumentPlusIcon className="h-8 w-8" />,
      colorClasses: 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm shadow-purple-200',
      onClick: () => void navigate('/purchase-orders/new'),
    },
    {
      label: 'Check Inventory',
      icon: <ArchiveBoxIcon className="h-8 w-8" />,
      colorClasses: 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-200',
      onClick: () => void navigate('/inventory'),
    },
  ];

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-3">Quick Actions</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action) => (
          <ActionCard key={action.label} {...action} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/dashboard/QuickActions.tsx
git commit -m "feat(dashboard): add QuickActions sub-component"
```

---

### Task 5: Full Dashboard.tsx — compose, queries, socket, toasts

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`

**Context:**

**Queries:**
- `dashboardStats` — `dashboardApi.getStats()`, key `['dashboard', 'stats']`, `refetchInterval: 30_000`
- `recentOrders` — `dashboardApi.getRecentOrders()`, key `['dashboard', 'recent-orders']`, `refetchInterval: 30_000`
- `lowStock` — `dashboardApi.getLowStockAlerts()`, key `['dashboard', 'low-stock']`, `refetchInterval: 30_000`

**Socket side-effects (single `useEffect`):**
- Subscribe to `order:created` → invalidate `['dashboard', 'stats']` + `['dashboard', 'recent-orders']` + toast "New order received"
- Subscribe to `order:status-changed` → invalidate `['dashboard', 'stats']` + `['dashboard', 'recent-orders']` + toast "Order status updated"
- Subscribe to `inventory:low-stock` → invalidate `['dashboard', 'low-stock']` + toast warning "Low stock alert"
- Subscribe to `inventory:adjusted` → invalidate `['dashboard', 'low-stock']`
- Return cleanup function from `subscribeToOrders` + `subscribeToInventory`

**Layout:**
- Page padding: `p-4 sm:p-6`
- Section spacing: `space-y-6`
- Two-column middle section: `grid grid-cols-1 lg:grid-cols-2 gap-6`
- Page title row (greeting + date) at top

**Error handling:** if any query has an error, show a non-blocking amber banner at the top of the page with retry button (calls `queryClient.invalidateQueries`).

- [ ] **Step 1: Write the complete replacement for `frontend/src/pages/Dashboard.tsx`**

```tsx
import type { JSX } from 'react';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { dashboardApi } from '../services/api';
import { subscribeToOrders, subscribeToInventory } from '../services/socket';
import { StatsGrid } from './dashboard/StatsGrid';
import { RecentOrders } from './dashboard/RecentOrders';
import { LowStockAlerts } from './dashboard/LowStockAlerts';
import { QuickActions } from './dashboard/QuickActions';
import type { Order, InventoryItem } from '../types';

export function DashboardPage(): JSX.Element {
  const queryClient = useQueryClient();

  const statsQuery = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardApi.getStats(),
    refetchInterval: 30_000,
    select: (res) => res.data,
  });

  const recentOrdersQuery = useQuery({
    queryKey: ['dashboard', 'recent-orders'],
    queryFn: () => dashboardApi.getRecentOrders(),
    refetchInterval: 30_000,
    select: (res) => res.data,
  });

  const lowStockQuery = useQuery({
    queryKey: ['dashboard', 'low-stock'],
    queryFn: () => dashboardApi.getLowStockAlerts(),
    refetchInterval: 30_000,
    select: (res) => res.data,
  });

  // Real-time socket subscriptions
  useEffect(() => {
    const unsubOrders = subscribeToOrders({
      onCreated: (_order: Order) => {
        void queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
        void queryClient.invalidateQueries({ queryKey: ['dashboard', 'recent-orders'] });
        toast.success('New order received', { id: 'order-created' });
      },
      onStatusChanged: (_order: Order) => {
        void queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
        void queryClient.invalidateQueries({ queryKey: ['dashboard', 'recent-orders'] });
        toast('Order status updated', { icon: '📋', id: 'order-status' });
      },
    });

    const unsubInventory = subscribeToInventory({
      onLowStock: (_item: InventoryItem) => {
        void queryClient.invalidateQueries({ queryKey: ['dashboard', 'low-stock'] });
        toast('Low stock alert', {
          icon: '⚠️',
          id: 'low-stock',
          style: { background: '#fffbeb', color: '#92400e' },
        });
      },
      onAdjusted: (_item: InventoryItem) => {
        void queryClient.invalidateQueries({ queryKey: ['dashboard', 'low-stock'] });
      },
    });

    return () => {
      unsubOrders();
      unsubInventory();
    };
  }, [queryClient]);

  const hasError = statsQuery.isError || recentOrdersQuery.isError || lowStockQuery.isError;
  const today = format(new Date(), 'EEEE, MMMM d');

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">{today}</p>
      </div>

      {/* Error banner */}
      {hasError && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <ExclamationCircleIcon className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 flex-1">
            Some data failed to load.
          </p>
          <button
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            }}
            className="text-sm font-semibold text-amber-700 hover:text-amber-900 transition-colors min-h-[44px] px-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats grid */}
      <StatsGrid stats={statsQuery.data} loading={statsQuery.isLoading} />

      {/* Two-column middle section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentOrders orders={recentOrdersQuery.data} loading={recentOrdersQuery.isLoading} />
        <LowStockAlerts items={lowStockQuery.data} loading={lowStockQuery.isLoading} />
      </div>

      {/* Quick actions */}
      <QuickActions />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx
git commit -m "feat(dashboard): complete Dashboard page with queries, socket, and sub-components"
```

---

## Self-Review

### Spec coverage
- ✅ Stats grid 2-col mobile / 4-col desktop — `StatsGrid` uses `grid-cols-2 lg:grid-cols-4`
- ✅ Colored icon backgrounds (blue/orange/green/purple) — Task 1
- ✅ Large number display — `text-2xl font-bold`
- ✅ Clickable stats → filtered orders — Task 1 `onClick` with navigate
- ✅ Recent orders — last 10, order number, customer name, StatusBadge, relative time — Task 2
- ✅ Click order row → `/orders/:id` — Task 2
- ✅ "View All" link → `/orders` — Task 2
- ✅ Empty state for recent orders — Task 2
- ✅ Low stock alerts — name, SKU, qty, reorder point — Task 3
- ✅ ExclamationTriangleIcon + amber color scheme — Task 3
- ✅ Click → `/inventory` — Task 3
- ✅ Success state when no low stock — Task 3 `CheckCircleIcon`
- ✅ Quick actions grid — New Order (blue), Add Customer (green), Create PO (purple), Check Inventory (amber) — Task 4
- ✅ Min 120px height touch targets — `min-h-[120px]`
- ✅ Icon + label layout — Task 4
- ✅ useQuery for stats, recent orders, low stock — Task 5
- ✅ 30-second auto-refresh — `refetchInterval: 30_000`
- ✅ Loading states — skeletons in each sub-component
- ✅ Error handling — amber banner + Retry button — Task 5
- ✅ Socket.IO real-time — `subscribeToOrders` + `subscribeToInventory` — Task 5
- ✅ Invalidate on new order, status change, inventory change — Task 5
- ✅ Toast notifications — `toast.success`, `toast` with icons — Task 5
- ✅ Fully responsive — `p-4 sm:p-6`, `grid-cols-1 lg:grid-cols-2`, hidden labels on sm

### Placeholder scan
No TBDs. All tasks have complete, runnable code.

### Type consistency
- `DashboardStats` from `types/index.ts`: `{ ordersToday, inProduction, readyToShip, revenueToday }` — used in `StatsGrid` ✅
- `dashboardApi.getStats()` returns `ApiResponse<DashboardStats>` → `select: (res) => res.data` unwraps to `DashboardStats` ✅
- `dashboardApi.getRecentOrders()` returns `ApiResponse<Order[]>` → `select: (res) => res.data` unwraps to `Order[]` ✅
- `dashboardApi.getLowStockAlerts()` returns `ApiResponse<InventoryItem[]>` → `select: (res) => res.data` unwraps to `InventoryItem[]` ✅
- `subscribeToOrders` callbacks typed as `(order: Order) => void` — matches import from `services/socket.ts` ✅
- `subscribeToInventory` callbacks typed as `(item: InventoryItem) => void` — matches `services/socket.ts` ✅
- Sub-component props all have matching prop types and usage in `Dashboard.tsx` ✅
