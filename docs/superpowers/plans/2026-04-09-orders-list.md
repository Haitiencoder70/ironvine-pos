# Orders List Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Orders list page with status tabs, filter bar, responsive table/card views, pagination, React Query data fetching, and Socket.IO real-time updates.

**Architecture:** Filter state lives in `OrderList.tsx` (the page) — `OrderFilters`, `OrderStatusTabs`, `OrderTable`, and `OrderCard` are pure presentational components that receive data and callbacks as props. React Query key includes the full filter state so each filter combination is independently cached. Socket.IO invalidates the `['orders']` query namespace on `order:created` and `order:status-changed`. The existing `Table` component from `components/ui` handles desktop layout; `OrderCard` handles mobile.

**Tech Stack:** TanStack Query v5, React Router DOM v6 (`useNavigate`, `useSearchParams`), Socket.IO client, `date-fns`, `@heroicons/react`, Tailwind CSS, `clsx`, existing UI components (`Table`, `SearchInput`, `Select`, `StatusBadge`, `TouchButton`, `TouchCard`)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/components/orders/PriorityBadge.tsx` | Create | Colored badge for NORMAL / HIGH / RUSH |
| `frontend/src/components/orders/OrderFilters.tsx` | Create | Search, status select, priority select, date range, active count, clear |
| `frontend/src/components/orders/OrderStatusTabs.tsx` | Create | Horizontal tabs for quick status filter with per-status counts |
| `frontend/src/components/orders/OrderCard.tsx` | Create | Mobile card for a single order |
| `frontend/src/pages/orders/OrderList.tsx` | Create | Full page: state, queries, socket, layout composition |
| `frontend/src/pages/Orders.tsx` | Modify | Re-export `OrderList` — keeps router import clean |

---

### Task 1: PriorityBadge component

**Files:**
- Create: `frontend/src/components/orders/PriorityBadge.tsx`

**Context:** Used in both desktop table and mobile cards. `OrderPriority` from `types/index.ts` is `'NORMAL' | 'HIGH' | 'RUSH'`. No `LOW` value exists in the Prisma enum.

- [ ] **Step 1: Create `frontend/src/components/orders/PriorityBadge.tsx`**

```tsx
import { clsx } from 'clsx';
import type { OrderPriority } from '../../types';

interface PriorityBadgeProps {
  priority: OrderPriority;
  size?: 'sm' | 'md';
}

const colorMap: Record<OrderPriority, string> = {
  NORMAL: 'bg-gray-100 text-gray-700',
  HIGH: 'bg-orange-100 text-orange-700',
  RUSH: 'bg-red-100 text-red-700',
};

const labelMap: Record<OrderPriority, string> = {
  NORMAL: 'Normal',
  HIGH: 'High',
  RUSH: 'Rush',
};

export function PriorityBadge({ priority, size = 'md' }: PriorityBadgeProps): React.JSX.Element {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        colorMap[priority]
      )}
    >
      {labelMap[priority]}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/orders/PriorityBadge.tsx
git commit -m "feat(orders): add PriorityBadge component"
```

---

### Task 2: OrderFilters component

**Files:**
- Create: `frontend/src/components/orders/OrderFilters.tsx`

**Context:**
- Receives `filters: FilterState` and `onChange: (f: FilterState) => void` — fully controlled
- `FilterState` is defined here and exported; `OrderList` imports it
- Status options: all 13 `OrderStatus` values plus an "All Statuses" empty option
- Priority options: NORMAL, HIGH, RUSH plus an "All Priorities" empty option
- Date range: two `<input type="date">` fields (native, works on mobile)
- Active filter count: count of non-empty filter fields (excluding search if empty counts are excluded — count status + priority + dateFrom + dateTo, ignoring search since it has its own clear)
- "Clear Filters" only shown when active count > 0 or search is non-empty
- `SearchInput` component from `components/ui` handles debounce internally

- [ ] **Step 1: Create `frontend/src/components/orders/OrderFilters.tsx`**

```tsx
import { XMarkIcon } from '@heroicons/react/24/outline';
import { SearchInput } from '../ui/SearchInput';
import { Select } from '../ui/Select';
import type { OrderStatus, OrderPriority } from '../../types';

export interface FilterState {
  search: string;
  status: OrderStatus | '';
  priority: OrderPriority | '';
  dateFrom: string;
  dateTo: string;
}

export const DEFAULT_FILTERS: FilterState = {
  search: '',
  status: '',
  priority: '',
  dateFrom: '',
  dateTo: '',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'QUOTE', label: 'Quote' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'MATERIALS_ORDERED', label: 'Materials Ordered' },
  { value: 'MATERIALS_RECEIVED', label: 'Materials Received' },
  { value: 'IN_PRODUCTION', label: 'In Production' },
  { value: 'QUALITY_CHECK', label: 'Quality Check' },
  { value: 'READY_TO_SHIP', label: 'Ready to Ship' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'RUSH', label: 'Rush' },
];

interface OrderFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export function OrderFilters({ filters, onChange }: OrderFiltersProps): React.JSX.Element {
  const activeCount = [
    filters.status !== '',
    filters.priority !== '',
    filters.dateFrom !== '',
    filters.dateTo !== '',
  ].filter(Boolean).length;

  const hasAnyFilter = activeCount > 0 || filters.search !== '';

  const handleClear = (): void => {
    onChange(DEFAULT_FILTERS);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: search + clear */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <SearchInput
            value={filters.search}
            onChange={(v) => onChange({ ...filters, search: v })}
            placeholder="Search order # or customer..."
          />
        </div>
        {hasAnyFilter && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0 whitespace-nowrap"
          >
            <XMarkIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Clear</span>
            {activeCount > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Row 2: status + priority + dates (horizontally scrollable on mobile) */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mb-1">
        <div className="min-w-[160px] flex-shrink-0">
          <Select
            options={STATUS_OPTIONS}
            value={filters.status}
            onChange={(v) => onChange({ ...filters, status: v as OrderStatus | '', })}
            placeholder="Status"
          />
        </div>
        <div className="min-w-[140px] flex-shrink-0">
          <Select
            options={PRIORITY_OPTIONS}
            value={filters.priority}
            onChange={(v) => onChange({ ...filters, priority: v as OrderPriority | '' })}
            placeholder="Priority"
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
            className="min-h-[44px] rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
            aria-label="From date"
          />
          <span className="text-gray-400 text-sm flex-shrink-0">to</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
            className="min-h-[44px] rounded-xl border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
            aria-label="To date"
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/orders/OrderFilters.tsx
git commit -m "feat(orders): add OrderFilters component"
```

---

### Task 3: OrderStatusTabs component

**Files:**
- Create: `frontend/src/components/orders/OrderStatusTabs.tsx`

**Context:**
- Shows 6 tab buttons: All, Quote, In Production, Ready to Ship, Shipped, Completed
- Each tab shows a count badge (from `statusCounts` prop — `{ status: string; count: number }[]`)
- Active tab is highlighted blue; clicking a tab calls `onStatusChange` with the status string (or '' for All)
- Horizontally scrollable on mobile — `overflow-x-auto` wrapper, `whitespace-nowrap` tabs
- Min 44px height per tab

- [ ] **Step 1: Create `frontend/src/components/orders/OrderStatusTabs.tsx`**

```tsx
import { clsx } from 'clsx';
import type { OrderStatus } from '../../types';

interface StatusCount {
  status: string;
  count: number;
}

interface Tab {
  label: string;
  value: OrderStatus | '';
}

const TABS: Tab[] = [
  { label: 'All Orders', value: '' },
  { label: 'Quote', value: 'QUOTE' },
  { label: 'In Production', value: 'IN_PRODUCTION' },
  { label: 'Ready to Ship', value: 'READY_TO_SHIP' },
  { label: 'Shipped', value: 'SHIPPED' },
  { label: 'Completed', value: 'COMPLETED' },
];

interface OrderStatusTabsProps {
  activeStatus: OrderStatus | '';
  onStatusChange: (status: OrderStatus | '') => void;
  statusCounts: StatusCount[];
  totalCount: number;
}

export function OrderStatusTabs({
  activeStatus,
  onStatusChange,
  statusCounts,
  totalCount,
}: OrderStatusTabsProps): React.JSX.Element {
  const getCount = (value: OrderStatus | ''): number | undefined => {
    if (value === '') return totalCount;
    return statusCounts.find((s) => s.status === value)?.count;
  };

  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-1 min-w-max border-b border-gray-200">
        {TABS.map((tab) => {
          const isActive = activeStatus === tab.value;
          const count = getCount(tab.value);

          return (
            <button
              key={tab.value}
              onClick={() => onStatusChange(tab.value)}
              className={clsx(
                'flex items-center gap-2 px-4 min-h-[44px] text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {tab.label}
              {count !== undefined && (
                <span
                  className={clsx(
                    'text-xs rounded-full px-2 py-0.5 font-semibold',
                    isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/orders/OrderStatusTabs.tsx
git commit -m "feat(orders): add OrderStatusTabs component"
```

---

### Task 4: OrderCard component (mobile)

**Files:**
- Create: `frontend/src/components/orders/OrderCard.tsx`

**Context:**
- Used on mobile (`md:hidden`) — one card per order
- Shows: order number (prominent), customer name, status badge, priority badge, item count, total, due date
- Entire card tappable — `onClick` handler
- Uses `TouchCard` with `interactive` + `padding="md"`
- `date-fns format` for due date display

- [ ] **Step 1: Create `frontend/src/components/orders/OrderCard.tsx`**

```tsx
import { format } from 'date-fns';
import { TouchCard } from '../ui/TouchCard';
import { StatusBadge } from '../ui/StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import type { Order } from '../../types';

interface OrderCardProps {
  order: Order;
  onClick: () => void;
}

export function OrderCard({ order, onClick }: OrderCardProps): React.JSX.Element {
  const customerName = order.customer
    ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
    : 'Unknown Customer';

  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(order.total);

  const formattedDate = order.dueDate
    ? format(new Date(order.dueDate), 'MMM d, yyyy')
    : null;

  return (
    <TouchCard interactive padding="md" onClick={onClick}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-gray-900">{order.orderNumber}</p>
          <p className="text-sm text-gray-500 truncate mt-0.5">{customerName}</p>
        </div>
        <StatusBadge status={order.status} size="sm" />
      </div>

      <div className="flex items-center justify-between mt-3">
        <PriorityBadge priority={order.priority} size="sm" />
        <span className="text-base font-semibold text-gray-900">{formattedTotal}</span>
      </div>

      <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
        <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
        {formattedDate && <span>Due {formattedDate}</span>}
      </div>
    </TouchCard>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/orders/OrderCard.tsx
git commit -m "feat(orders): add OrderCard mobile component"
```

---

### Task 5: OrderList page

**Files:**
- Create: `frontend/src/pages/orders/OrderList.tsx`

**Context:**

**State:**
- `filters: FilterState` — initialized from URL search params so links are shareable/bookmarkable
- `page: number` — resets to 1 when any filter changes
- `sortKey / sortDirection` — client-side sort on current page (backend returns createdAt desc by default)

**URL sync:** Use `useSearchParams` to read initial filter state and write changes back — allows linking to filtered views (e.g., `?status=IN_PRODUCTION` from Dashboard stat cards).

**Queries:**
- `['orders', filters, page]` → `orderApi.getAll({ ...activeFilters, page, limit: 20 })` — `select: (r) => r.data`
- `['orders', 'status-counts']` → `dashboardApi.getOrdersByStatus()` — `select: (r) => r.data`, `staleTime: 60_000`

**Socket (useEffect):**
- `subscribeToOrders({ onCreated, onStatusChanged })` — invalidate `['orders']`, show toast

**Table columns (desktop):**
Order#, Customer, Status, Priority, Items, Total, Due Date, Created, Actions

**Pagination:** Show page buttons from 1 to `totalPages`. Only show up to 7 page buttons with ellipsis logic if `totalPages > 7` (show first, last, and ±2 around current). Previous/Next always shown.

- [ ] **Step 1: Create `frontend/src/pages/orders/OrderList.tsx`**

```tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { orderApi } from '../../services/api';
import { dashboardApi } from '../../services/api';
import { subscribeToOrders } from '../../services/socket';
import { Table } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { OrderFilters, FilterState, DEFAULT_FILTERS } from '../../components/orders/OrderFilters';
import { OrderStatusTabs } from '../../components/orders/OrderStatusTabs';
import { OrderCard } from '../../components/orders/OrderCard';
import { PriorityBadge } from '../../components/orders/PriorityBadge';
import type { Order, OrderStatus } from '../../types';
import type { Column } from '../../components/ui/Table';

const LIMIT = 20;

function filtersToParams(filters: FilterState, page: number): Record<string, string | number> {
  const params: Record<string, string | number> = { page, limit: LIMIT };
  if (filters.search) params['search'] = filters.search;
  if (filters.status) params['status'] = filters.status;
  if (filters.priority) params['priority'] = filters.priority;
  if (filters.dateFrom) params['dateFrom'] = filters.dateFrom;
  if (filters.dateTo) params['dateTo'] = filters.dateTo;
  return params;
}

function searchParamsToFilters(sp: URLSearchParams): FilterState {
  return {
    search: sp.get('search') ?? '',
    status: (sp.get('status') ?? '') as OrderStatus | '',
    priority: (sp.get('priority') ?? '') as FilterState['priority'],
    dateFrom: sp.get('dateFrom') ?? '',
    dateTo: sp.get('dateTo') ?? '',
  };
}

function getPageButtons(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

export function OrderList(): React.JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<FilterState>(() => searchParamsToFilters(searchParams));
  const [page, setPage] = useState(1);

  // Sync filter changes to URL
  const handleFiltersChange = useCallback((newFilters: FilterState): void => {
    setFilters(newFilters);
    setPage(1);
    const sp = new URLSearchParams();
    if (newFilters.search) sp.set('search', newFilters.search);
    if (newFilters.status) sp.set('status', newFilters.status);
    if (newFilters.priority) sp.set('priority', newFilters.priority);
    if (newFilters.dateFrom) sp.set('dateFrom', newFilters.dateFrom);
    if (newFilters.dateTo) sp.set('dateTo', newFilters.dateTo);
    setSearchParams(sp, { replace: true });
  }, [setSearchParams]);

  const handleStatusTabChange = useCallback((status: OrderStatus | ''): void => {
    handleFiltersChange({ ...filters, status });
  }, [filters, handleFiltersChange]);

  const ordersQuery = useQuery({
    queryKey: ['orders', filters, page],
    queryFn: () => orderApi.getAll(filtersToParams(filters, page)),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  });

  const statusCountsQuery = useQuery({
    queryKey: ['orders', 'status-counts'],
    queryFn: () => dashboardApi.getOrdersByStatus(),
    select: (res) => res.data,
    staleTime: 60_000,
  });

  // Socket real-time
  useEffect(() => {
    const unsub = subscribeToOrders({
      onCreated: (_order: Order) => {
        void queryClient.invalidateQueries({ queryKey: ['orders'] });
        toast.success('New order received', { id: 'order-created' });
      },
      onStatusChanged: (_order: Order) => {
        void queryClient.invalidateQueries({ queryKey: ['orders'] });
        toast('Order status updated', { icon: '📋', id: 'order-status' });
      },
    });
    return unsub;
  }, [queryClient]);

  const orders = ordersQuery.data?.data ?? [];
  const total = ordersQuery.data?.total ?? 0;
  const totalPages = ordersQuery.data?.totalPages ?? 1;
  const statusCounts = statusCountsQuery.data ?? [];

  const columns: Column<Order>[] = [
    {
      key: 'orderNumber',
      header: 'Order #',
      render: (order) => (
        <span className="font-semibold text-blue-600">{order.orderNumber}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (order) =>
        order.customer
          ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
          : '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (order) => <StatusBadge status={order.status} size="sm" />,
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (order) => <PriorityBadge priority={order.priority} size="sm" />,
    },
    {
      key: 'items',
      header: 'Items',
      align: 'center',
      render: (order) => String(order.items.length),
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: (order) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(order.total),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (order) =>
        order.dueDate ? format(new Date(order.dueDate), 'MMM d, yyyy') : '—',
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (order) => format(new Date(order.createdAt), 'MMM d, yyyy'),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (order) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            void navigate(`/orders/${order.id}`);
          }}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium min-h-[44px] px-2"
        >
          View
        </button>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          {total > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">{total} order{total !== 1 ? 's' : ''}</p>
          )}
        </div>
        <button
          onClick={() => void navigate('/orders/new')}
          className="flex items-center gap-2 min-h-[44px] px-5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors flex-shrink-0"
        >
          <PlusIcon className="h-4 w-4" />
          <span className="hidden sm:inline">New Order</span>
        </button>
      </div>

      {/* Status tabs */}
      <OrderStatusTabs
        activeStatus={filters.status}
        onStatusChange={handleStatusTabChange}
        statusCounts={statusCounts}
        totalCount={total}
      />

      {/* Filter bar */}
      <OrderFilters filters={filters} onChange={handleFiltersChange} />

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table
          columns={columns}
          data={orders}
          loading={ordersQuery.isLoading}
          onRowClick={(order) => void navigate(`/orders/${order.id}`)}
          emptyMessage="No orders match your filters"
        />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {ordersQuery.isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-4 animate-pulse space-y-3">
              <div className="flex justify-between">
                <div className="h-5 bg-gray-100 rounded w-28" />
                <div className="h-5 bg-gray-100 rounded-full w-20" />
              </div>
              <div className="h-4 bg-gray-100 rounded w-40" />
              <div className="flex justify-between">
                <div className="h-4 bg-gray-100 rounded-full w-16" />
                <div className="h-4 bg-gray-100 rounded w-16" />
              </div>
            </div>
          ))
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="font-medium">No orders match your filters</p>
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onClick={() => void navigate(`/orders/${order.id}`)}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>

          {getPageButtons(page, totalPages).map((btn, i) =>
            btn === '...' ? (
              <span key={`ellipsis-${i}`} className="px-2 text-gray-400 min-h-[44px] flex items-center">
                …
              </span>
            ) : (
              <button
                key={btn}
                onClick={() => setPage(btn)}
                className={`min-h-[44px] min-w-[44px] rounded-xl text-sm font-medium transition-colors ${
                  page === btn
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {btn}
              </button>
            )
          )}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/orders/OrderList.tsx
git commit -m "feat(orders): add OrderList page with filters, tabs, table, cards, pagination, socket"
```

---

### Task 6: Update Orders.tsx

**Files:**
- Modify: `frontend/src/pages/Orders.tsx`

**Context:** The router in `App.tsx` imports `OrdersPage` from `@/pages/Orders`. That component is currently a stub. Update it to render `OrderList`. Keep the named export `OrdersPage` so `App.tsx` doesn't need to change.

- [ ] **Step 1: Replace `frontend/src/pages/Orders.tsx`**

```tsx
import type { JSX } from 'react';
import { OrderList } from './orders/OrderList';

export function OrdersPage(): JSX.Element {
  return <OrderList />;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Orders.tsx
git commit -m "feat(orders): wire OrderList into Orders page"
```

---

## Self-Review

### Spec coverage
- ✅ Page title "Orders" + "New Order" button — Task 5 header section
- ✅ Status filter dropdown (all 13 statuses) — Task 2
- ✅ Priority filter (NORMAL, HIGH, RUSH) — Task 2 (no LOW — not in Prisma enum)
- ✅ Date range picker (from/to) — Task 2, native `<input type="date">`
- ✅ Search box (debounced via SearchInput component) — Task 2
- ✅ "Clear Filters" button — Task 2, shown only when filters active
- ✅ Active filter count badge — Task 2, blue badge on clear button
- ✅ Status tabs: All, Quote, In Production, Ready to Ship, Shipped, Completed — Task 3
- ✅ Tab counts — Task 3 uses `statusCounts` from `dashboardApi.getOrdersByStatus()`
- ✅ Desktop table: Order#, Customer, Status Badge, Priority Badge, Items, Total, Due Date, Created, Actions (View) — Task 5
- ✅ Mobile card view — Tasks 4 + 5, shown with `md:hidden`
- ✅ Mobile card: order number, customer, status badge, total, tap to view — Task 4
- ✅ Pagination 20/page, touch-friendly controls, Previous/Next, page buttons with ellipsis — Task 5
- ✅ React Query with filter-based cache key — Task 5
- ✅ `placeholderData` for smooth filter transitions — Task 5
- ✅ Socket.IO: new order + status change → invalidate + toast — Task 5
- ✅ Loading skeletons (table uses `Table` skeleton, mobile uses custom skeleton) — Task 5
- ✅ URL sync for shareable filtered links — Task 5 `useSearchParams`

### Placeholder scan
No TBDs. All tasks have complete, runnable code.

### Type consistency
- `FilterState` exported from `OrderFilters.tsx`, imported in `OrderList.tsx` ✅
- `DEFAULT_FILTERS` exported from `OrderFilters.tsx`, used for clear action ✅
- `Column<Order>` from `components/ui/Table` — `key` is `keyof Order | string`, all keys used are valid ✅
- `order.total` — `number` in `types/index.ts` → `Intl.NumberFormat` works ✅
- `order.items.length` — `items: OrderItem[]` on `Order` type ✅
- `PriorityBadge` `priority` prop is `OrderPriority` — `order.priority` is `OrderPriority` ✅
- `subscribeToOrders` callback types `(order: Order) => void` — matches `services/socket.ts` ✅
- `dashboardApi.getOrdersByStatus()` returns `ApiResponse<{ status: string; count: number }[]>` → `select: (res) => res.data` gives `{ status: string; count: number }[]` ✅
- `statusCounts` passed to `OrderStatusTabs` as `StatusCount[]` — `{ status: string; count: number }[]` matches ✅
