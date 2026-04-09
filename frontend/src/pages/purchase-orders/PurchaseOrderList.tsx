import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders';
import { useVendors } from '../../hooks/useVendors';
import { useDebounce } from '../../hooks/useDebounce';
import { TouchButton } from '../../components/ui/TouchButton';
import { TouchCard } from '../../components/ui/TouchCard';
import type { JSX } from 'react';
import type { PurchaseOrderStatus } from '../../types';

// ─── Formatting ───────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

const STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; bg: string; text: string }> = {
  DRAFT: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700' },
  SENT: { label: 'Sent', bg: 'bg-blue-100', text: 'text-blue-800' },
  PARTIALLY_RECEIVED: { label: 'Partial', bg: 'bg-amber-100', text: 'text-amber-800' },
  RECEIVED: { label: 'Received', bg: 'bg-green-100', text: 'text-green-800' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-red-100', text: 'text-red-800' },
};

// ─── Component ─────────────────────────────────────────────────────────────────

export function PurchaseOrderListPage(): JSX.Element {
  const navigate = useNavigate();

  // Filters State
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [status, setStatus] = useState<PurchaseOrderStatus | ''>('');
  const [vendorId, setVendorId] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Data Loading
  const { data: vendorsList } = useVendors({ limit: 100 });
  const vendors = vendorsList?.data?.data ?? [];

  const { data, isLoading, isError } = usePurchaseOrders({
    page,
    limit,
    status: status || undefined,
    vendorId: vendorId || undefined,
    // Note: The API doesn't fully support text search in the list schema yet,
    // so we handle it locally if possible or omit if unsupported based on backend.
    // For now, passing filter state as permitted in POListParams.
  });

  const rawOrders = data?.data?.data ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = data?.data?.totalPages ?? 1;

  // Local Search Applier
  const purchaseOrders = rawOrders.filter((po) => {
    if (!debouncedSearch) return true;
    const lower = debouncedSearch.toLowerCase();
    return po.poNumber.toLowerCase().includes(lower);
  });

  // Handlers
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [totalPages]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-1">Manage external supplier part orders.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TouchButton
            variant="primary"
            size="md"
            icon={<PlusIcon className="h-5 w-5" />}
            onClick={() => navigate('/purchase-orders/new')}
          >
            Create PO
          </TouchButton>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search PO number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 min-h-[44px] rounded-xl border border-gray-300 bg-white text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* Status */}
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as PurchaseOrderStatus | '');
            setPage(1);
          }}
          className="md:w-48 min-h-[44px] rounded-xl border border-gray-300 bg-white px-3 text-base shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>

        {/* Vendor */}
        <div className="relative md:w-56">
           <BuildingStorefrontIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
           <select
             value={vendorId}
             onChange={(e) => {
               setVendorId(e.target.value);
               setPage(1);
             }}
             className="w-full pl-10 pr-4 min-h-[44px] rounded-xl border border-gray-300 bg-white text-base shadow-sm cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
           >
             <option value="">All Vendors</option>
             {vendors.map((v) => (
               <option key={v.id} value={v.id}>{v.name}</option>
             ))}
           </select>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">PO Number</th>
                <th className="px-6 py-4">Vendor</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Linked Order</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                     <td className="px-6 py-4"><div className="h-4 w-20 bg-gray-100 rounded" /></td>
                     <td className="px-6 py-4"><div className="h-4 w-32 bg-gray-100 rounded" /></td>
                     <td className="px-6 py-4"><div className="h-6 w-16 bg-gray-100 rounded-full" /></td>
                     <td className="px-6 py-4"><div className="h-4 w-20 bg-gray-100 rounded" /></td>
                     <td className="px-6 py-4"><div className="h-4 w-16 bg-gray-100 rounded ml-auto" /></td>
                     <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-100 rounded" /></td>
                     <td className="px-6 py-4"><div className="h-8 w-16 bg-gray-100 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : isError || purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No purchase orders found.
                  </td>
                </tr>
              ) : (
                purchaseOrders.map((po) => {
                  const badge = STATUS_CONFIG[po.status];
                  return (
                    <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900 cursor-pointer" onClick={() => navigate(`/purchase-orders/${po.id}`)}>
                        {po.poNumber}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-700">
                        {po.vendor?.name || 'Unknown Vendor'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={clsx('px-2.5 py-1 rounded-full text-xs font-semibold', badge.bg, badge.text)}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {po.linkedOrderId ? (
                          <span 
                            className="text-blue-600 hover:underline cursor-pointer"
                            onClick={() => navigate(`/orders/${po.linkedOrderId}`)}
                          >
                            View Order
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-900">
                        {fmt(po.total)}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {format(new Date(po.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <TouchButton
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/purchase-orders/${po.id}`)}
                        >
                          Details
                        </TouchButton>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
             <div key={i} className="animate-pulse bg-white p-5 rounded-2xl border border-gray-100 h-[140px]" />
          ))
        ) : isError || purchaseOrders.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-gray-100 text-gray-500">
            No purchase orders found.
          </div>
        ) : (
          purchaseOrders.map((po) => {
            const badge = STATUS_CONFIG[po.status];
            return (
              <TouchCard
                key={po.id}
                onClick={() => navigate(`/purchase-orders/${po.id}`)}
                padding="md"
                className="border border-gray-100"
              >
                <div className="flex justify-between items-start gap-3 mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{po.poNumber}</h3>
                    <p className="text-sm font-medium text-gray-700">{po.vendor?.name}</p>
                  </div>
                  <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide', badge.bg, badge.text)}>
                    {badge.label}
                  </span>
                </div>
                
                <div className="flex justify-between items-end mt-4">
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>{format(new Date(po.createdAt), 'MMM d, yyyy')}</p>
                    {po.linkedOrderId && (
                       <p className="text-blue-600 font-medium">Per-Job PO</p>
                    )}
                  </div>
                  <div className="text-right text-lg font-bold text-gray-900 border-l border-gray-100 pl-4 py-1">
                    {fmt(po.total)}
                  </div>
                </div>
              </TouchCard>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-6 mt-6">
          <p className="text-sm text-gray-500 hidden sm:block">
            Showing <span className="font-medium text-gray-900">{purchaseOrders.length}</span> of{' '}
            <span className="font-medium text-gray-900">{total}</span>
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <TouchButton
              variant="secondary"
              size="md"
              icon={<ChevronLeftIcon className="h-5 w-5" />}
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1 || isLoading}
            >
              Previous
            </TouchButton>
            <TouchButton
              variant="secondary"
              size="md"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages || isLoading}
            >
              Next
              <ChevronRightIcon className="h-5 w-5 ml-1" />
            </TouchButton>
          </div>
        </div>
      )}
    </div>
  );
}
