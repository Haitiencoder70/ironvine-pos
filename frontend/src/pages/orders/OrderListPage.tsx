import { useCallback, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InboxIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { TouchButton } from '../../components/ui/TouchButton';
import { OrderFilters } from '../../components/orders/OrderFilters';
import {
  OrderTableRow,
  OrderMobileCard,
} from '../../components/orders/OrderRow';
import { useOrders, type OrderListParams } from '../../hooks/useOrders';
import { SkeletonLoader, EmptyState } from '../../components/ui';
import type { JSX } from 'react';
import type { OrderStatus } from '../../types';

// ─── Status Tabs ───────────────────────────────────────────────────────────────

interface StatusTab {
  label: string;
  value: OrderStatus | '';
  colorClass: string;
}

const STATUS_TABS: StatusTab[] = [
  { label: 'All', value: '', colorClass: 'text-gray-600' },
  { label: 'Quote', value: 'QUOTE', colorClass: 'text-gray-600' },
  { label: 'Approved', value: 'APPROVED', colorClass: 'text-blue-600' },
  { label: 'In Production', value: 'IN_PRODUCTION', colorClass: 'text-purple-600' },
  { label: 'Ready to Ship', value: 'READY_TO_SHIP', colorClass: 'text-emerald-600' },
  { label: 'Shipped', value: 'SHIPPED', colorClass: 'text-cyan-600' },
  { label: 'Completed', value: 'COMPLETED', colorClass: 'text-green-600' },
];

const PAGE_SIZE = 20;

// ─── Filter State Reducer ─────────────────────────────────────────────────────

type FiltersAction =
  | { type: 'UPDATE'; payload: Partial<OrderListParams> }
  | { type: 'CLEAR' }
  | { type: 'SET_TAB'; status: OrderStatus | '' }
  | { type: 'SET_PAGE'; page: number }
  | { type: 'SET_SORT'; key: string; dir: 'asc' | 'desc' };

const DEFAULT_FILTERS: OrderListParams = {
  page: 1,
  limit: PAGE_SIZE,
  search: '',
  status: '' as OrderStatus | '',
  priority: '',
  dateFrom: '',
  dateTo: '',
  sortKey: 'createdAt',
  sortDir: 'desc',
};

function filtersReducer(
  state: OrderListParams,
  action: FiltersAction
): OrderListParams {
  switch (action.type) {
    case 'UPDATE':
      return { ...state, ...action.payload };
    case 'CLEAR':
      return { ...DEFAULT_FILTERS };
    case 'SET_TAB':
      return { ...state, status: action.status, page: 1 };
    case 'SET_PAGE':
      return { ...state, page: action.page };
    case 'SET_SORT':
      return { ...state, sortKey: action.key, sortDir: action.dir, page: 1 };
    default:
      return state;
  }
}

// ─── Pagination ────────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-1 py-4">
      <button
        id="orders-prev-page"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        className={clsx(
          'inline-flex items-center justify-center h-11 w-11 rounded-xl',
          'transition-colors font-medium text-sm',
          page === 1
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
        )}
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </button>

      {getPageNumbers().map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="px-1 text-gray-400 text-sm">
            …
          </span>
        ) : (
          <button
            key={p}
            id={`orders-page-${p}`}
            onClick={() => onPageChange(p as number)}
            aria-current={p === page ? 'page' : undefined}
            className={clsx(
              'inline-flex items-center justify-center h-11 w-11 rounded-xl',
              'transition-colors font-semibold text-sm',
              p === page
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
            )}
          >
            {p}
          </button>
        )
      )}

      <button
        id="orders-next-page"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
        className={clsx(
          'inline-flex items-center justify-center h-11 w-11 rounded-xl',
          'transition-colors font-medium text-sm',
          page === totalPages
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
        )}
      >
        <ChevronRightIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

// ─── Table Header ─────────────────────────────────────────────────────────────

interface ThProps {
  label: string;
  sortKey?: string;
  currentSortKey?: string;
  currentSortDir?: 'asc' | 'desc';
  align?: 'left' | 'center' | 'right';
  onSort?: (key: string) => void;
}

function Th({
  label,
  sortKey,
  currentSortKey,
  currentSortDir,
  align = 'left',
  onSort,
}: ThProps) {
  const isCurrent = sortKey && currentSortKey === sortKey;

  return (
    <th
      scope="col"
      onClick={() => sortKey && onSort?.(sortKey)}
      className={clsx(
        'px-4 py-3 text-sm font-semibold text-gray-900 bg-gray-50',
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
        sortKey && onSort && 'cursor-pointer hover:bg-gray-100 select-none transition-colors'
      )}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isCurrent && (
          <span className="text-blue-600 text-xs">
            {currentSortDir === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </span>
    </th>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function OrderListPage(): JSX.Element {
  const navigate = useNavigate();
  const [filters, dispatch] = useReducer(filtersReducer, { ...DEFAULT_FILTERS });

  const { data, isLoading, isError, refetch, isFetching } = useOrders(filters, {
    realtime: true,
  });

  const orders = data?.data?.data ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = data?.data?.totalPages ?? 1;

  const handleFiltersChange = useCallback(
    (updates: Partial<OrderListParams>) =>
      dispatch({ type: 'UPDATE', payload: updates }),
    []
  );

  const handleClearAll = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  const handleTabChange = useCallback(
    (status: OrderStatus | '') => dispatch({ type: 'SET_TAB', status }),
    []
  );

  const handlePageChange = useCallback(
    (page: number) => dispatch({ type: 'SET_PAGE', page }),
    []
  );

  const handleSort = useCallback((key: string) => {
    dispatch({
      type: 'SET_SORT',
      key,
      dir:
        filters.sortKey === key && filters.sortDir === 'asc' ? 'desc' : 'asc',
    });
  }, [filters.sortKey, filters.sortDir]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isLoading ? 'Loading…' : `${total.toLocaleString()} order${total !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isFetching && !isLoading && (
            <ArrowPathIcon className="h-4 w-4 text-gray-400 animate-spin" />
          )}
          <TouchButton
            id="orders-new-order"
            variant="primary"
            size="md"
            icon={<PlusIcon className="h-5 w-5" />}
            onClick={() => navigate('/orders/new')}
          >
            New Order
          </TouchButton>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {isError && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <ExclamationCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">
            Failed to load orders. Please check your connection.
          </p>
          <TouchButton variant="danger" size="sm" onClick={() => void refetch()}>
            Retry
          </TouchButton>
        </div>
      )}

      {/* ── Status Tabs ── */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 pb-1">
        <div className="flex gap-1 px-4 sm:px-0 min-w-max sm:min-w-0 border-b border-gray-200">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value || 'all'}
              id={`orders-tab-${tab.value || 'all'}`}
              onClick={() => handleTabChange(tab.value)}
              className={clsx(
                'relative px-4 py-3 text-sm font-medium whitespace-nowrap min-h-[44px]',
                'transition-colors focus:outline-none',
                filters.status === tab.value
                  ? `${tab.colorClass} border-b-2 border-current -mb-px`
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-t-lg'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <OrderFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearAll={handleClearAll}
        isLoading={isFetching}
      />

      {/* ── Content ── */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Desktop skeleton */}
            <div className="hidden sm:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="min-w-full">
                <thead>
                  <tr>
                    {['Order #', 'Customer', 'Status', 'Priority', 'Items', 'Total', 'Due', 'Created', ''].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-sm font-semibold text-gray-900 bg-gray-50"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  <SkeletonLoader variant="table" rows={8} />
                </tbody>
              </table>
            </div>

            {/* Mobile skeleton */}
            <div className="sm:hidden space-y-3">
              <SkeletonLoader variant="card" rows={5} />
            </div>
          </motion.div>
        ) : !isError && orders.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <EmptyState
              icon={<InboxIcon className="h-10 w-10" />}
              title="No orders found"
              description={
                filters.search || filters.status || filters.priority || filters.dateFrom || filters.dateTo
                  ? 'Try adjusting your filters or clearing the search.'
                  : 'Create your first order to get started.'
              }
              action={
                filters.search || filters.status || filters.priority 
                ? { label: 'Clear Filters', onClick: handleClearAll }
                : { label: 'New Order', href: '/orders/new', icon: <PlusIcon className="h-5 w-5" /> }
              }
            />
          </motion.div>
        ) : (
          <motion.div
            key="data"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* ── Desktop Table ── */}
            <div className="hidden sm:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full" role="grid">
                  <thead>
                    <tr>
                      <Th
                        label="Order #"
                        sortKey="orderNumber"
                        currentSortKey={filters.sortKey}
                        currentSortDir={filters.sortDir}
                        onSort={handleSort}
                      />
                      <Th
                        label="Customer"
                        sortKey="customer.lastName"
                        currentSortKey={filters.sortKey}
                        currentSortDir={filters.sortDir}
                        onSort={handleSort}
                      />
                      <Th label="Status" />
                      <Th label="Priority" />
                      <Th label="Items" align="center" />
                      <Th
                        label="Total"
                        sortKey="total"
                        currentSortKey={filters.sortKey}
                        currentSortDir={filters.sortDir}
                        onSort={handleSort}
                        align="right"
                      />
                      <Th
                        label="Due"
                        sortKey="dueDate"
                        currentSortKey={filters.sortKey}
                        currentSortDir={filters.sortDir}
                        onSort={handleSort}
                      />
                      <Th
                        label="Created"
                        sortKey="createdAt"
                        currentSortKey={filters.sortKey}
                        currentSortDir={filters.sortDir}
                        onSort={handleSort}
                      />
                      <th className="px-4 py-3 bg-gray-50" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {orders.map((order) => (
                      <OrderTableRow key={order.id} order={order} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination inside card for desktop */}
              {totalPages > 1 && (
                <div className="border-t border-gray-100">
                  <div className="flex items-center justify-between px-4 py-3">
                    <p className="text-sm text-gray-500">
                      Showing{' '}
                      <span className="font-medium text-gray-700">
                        {((filters.page ?? 1) - 1) * PAGE_SIZE + 1}–
                        {Math.min((filters.page ?? 1) * PAGE_SIZE, total)}
                      </span>{' '}
                      of{' '}
                      <span className="font-medium text-gray-700">
                        {total.toLocaleString()}
                      </span>
                    </p>
                    <Pagination
                      page={filters.page ?? 1}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Mobile Cards ── */}
            <div className="sm:hidden space-y-3">
              {orders.map((order) => (
                <OrderMobileCard key={order.id} order={order} />
              ))}

              {totalPages > 1 && (
                <Pagination
                  page={filters.page ?? 1}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
