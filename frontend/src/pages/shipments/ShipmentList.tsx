import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TruckIcon,
  ArchiveBoxIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { useShipments } from '../../hooks/useShipments';
import { useDebounce } from '../../hooks/useDebounce';
import { TouchButton } from '../../components/ui/TouchButton';
import { TouchCard } from '../../components/ui/TouchCard';
import { SkeletonLoader, EmptyState } from '../../components/ui';
import type { ShipmentStatus, ShipmentCarrier } from '../../types';
import type { JSX } from 'react';


// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ShipmentStatus, { label: string; text: string; bg: string }> = {
  PENDING: { label: 'Pending', text: 'text-amber-800', bg: 'bg-amber-100' },
  LABEL_CREATED: { label: 'Label Created', text: 'text-blue-800', bg: 'bg-blue-100' },
  IN_TRANSIT: { label: 'In Transit', text: 'text-purple-800', bg: 'bg-purple-100' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', text: 'text-indigo-800', bg: 'bg-indigo-100' },
  DELIVERED: { label: 'Delivered', text: 'text-green-800', bg: 'bg-green-100' },
  EXCEPTION: { label: 'Issue / Exception', text: 'text-red-800', bg: 'bg-red-100' },
};

const CARRIERS: ShipmentCarrier[] = ['USPS', 'UPS', 'FEDEX', 'DHL', 'OTHER'];

// ─── Component ─────────────────────────────────────────────────────────────────

export function ShipmentListPage(): JSX.Element {
  const navigate = useNavigate();

  // Filters State
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [status, setStatus] = useState<ShipmentStatus | ''>('');
  const [carrier, setCarrier] = useState<ShipmentCarrier | ''>('');
  
  const [page, setPage] = useState(1);
  const limit = 20;

  // Data Loading
  const { data, isLoading, isError } = useShipments({
    page,
    limit,
    status: status || undefined,
    carrier: carrier || undefined,
    search: debouncedSearch || undefined, // assuming API handles this or we filter locally
  });

  const rawShipments = data?.data?.data ?? [];
  const totalPages = data?.data?.totalPages ?? 1;

  // Local Search (if API doesn't handle partial matches on nested objects)
  const shipments = rawShipments.filter((s) => {
    if (!debouncedSearch) return true;
    const lower = debouncedSearch.toLowerCase();
    const matchesTracking = s.trackingNumber?.toLowerCase().includes(lower);
    const matchesOrder = s.order?.orderNumber?.toLowerCase().includes(lower);
    return matchesTracking || matchesOrder;
  });

  // Calculate Quick Stats based on current page/feed (or realistically from a dashboard endpoint)
  const pendingCount = shipments.filter(s => s.status === 'PENDING' || s.status === 'LABEL_CREATED').length;
  const transitCount = shipments.filter(s => s.status === 'IN_TRANSIT' || s.status === 'OUT_FOR_DELIVERY').length;
  const deliveredCount = shipments.filter(s => s.status === 'DELIVERED').length;

  const handlePageChange = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [totalPages]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div>
         <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
         <p className="text-sm text-gray-500 mt-1">Track outbound packages and routing statuses.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <TouchCard padding="md" className="border-l-4 border-l-amber-500 flex items-center pr-10">
            <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0 mr-4">
              <ArchiveBoxIcon className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-semibold uppercase tracking-wide">Processing</p>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
            </div>
         </TouchCard>
         <TouchCard padding="md" className="border-l-4 border-l-purple-500 flex items-center pr-10">
            <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0 mr-4">
              <TruckIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-semibold uppercase tracking-wide">In Transit</p>
              <p className="text-2xl font-bold text-gray-900">{transitCount}</p>
            </div>
         </TouchCard>
         <TouchCard padding="md" className="border-l-4 border-l-green-500 flex items-center pr-10">
            <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center shrink-0 mr-4">
              <CheckBadgeIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-semibold uppercase tracking-wide">Delivered</p>
              <p className="text-2xl font-bold text-gray-900">{deliveredCount}</p>
            </div>
         </TouchCard>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tracking # or Order #..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 min-h-[44px] rounded-xl border border-gray-300 bg-white text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <select
          value={carrier}
          onChange={(e) => {
            setCarrier(e.target.value as ShipmentCarrier | '');
            setPage(1);
          }}
          className="md:w-48 min-h-[44px] rounded-xl border border-gray-300 bg-white px-3 text-base shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Carriers</option>
          {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ShipmentStatus | '');
            setPage(1);
          }}
          className="md:w-56 min-h-[44px] rounded-xl border border-gray-300 bg-white px-3 text-base shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Linked Order</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Carrier</th>
                <th className="px-6 py-4">Tracking</th>
                <th className="px-6 py-4">Updated</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <SkeletonLoader variant="table" rows={5} />
              ) : isError || shipments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <div className="flex justify-center p-8">
                      <EmptyState
                        icon={<TruckIcon className="h-10 w-10" />}
                        title="No shipments found"
                        description="Try adjusting your filters or tracking number."
                        minHeight="min-h-[300px]"
                        className="w-full max-w-lg border-0 shadow-none bg-transparent"
                      />
                    </div>
                  </td>
                </tr>
              ) : (
                shipments.map((s) => {
                  const badge = STATUS_CONFIG[s.status];
                  return (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold">
                        <span 
                          className="text-blue-600 hover:underline cursor-pointer"
                          onClick={() => navigate(`/orders/${s.orderId}`)}
                        >
                          {s.order?.orderNumber || s.orderId.substring(0, 8)}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-700">
                        {s.order?.customer?.firstName ? `${s.order.customer.firstName} ${s.order.customer.lastName}` : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={clsx('px-2.5 py-1 rounded-full text-xs font-semibold', badge.bg, badge.text)}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-700">
                        {s.carrier}
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-600">
                        {s.trackingNumber || <span className="italic text-gray-400">Processing</span>}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {format(new Date(s.updatedAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <TouchButton
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/shipments/${s.id}`)}
                        >
                          Track
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
          <SkeletonLoader variant="card" rows={4} />
        ) : isError || shipments.length === 0 ? (
          <EmptyState
            icon={<TruckIcon className="h-8 w-8" />}
            title="No shipments found"
            description="Try adjusting your search features."
            minHeight="min-h-[200px]"
          />
        ) : (
          shipments.map((s) => {
            const badge = STATUS_CONFIG[s.status];
            return (
              <TouchCard
                key={s.id}
                onClick={() => navigate(`/shipments/${s.id}`)}
                padding="md"
                className="border border-gray-100"
              >
                <div className="flex justify-between items-start gap-3 mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{s.carrier}</h3>
                    <p className="text-sm font-medium text-gray-700 mt-0.5">Job: {s.order?.orderNumber}</p>
                  </div>
                  <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide text-center max-w-[100px]', badge.bg, badge.text)}>
                    {badge.label}
                  </span>
                </div>
                
                <div className="flex justify-between items-end mt-4 pt-3 border-t border-gray-50">
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Updated: {format(new Date(s.updatedAt), 'MMM d')}</p>
                  </div>
                  <div className="text-right text-sm font-bold text-gray-900 border-l border-gray-100 pl-4 py-1 font-mono">
                    {s.trackingNumber || 'Pending'}
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
            Showing <span className="font-medium text-gray-900">{shipments.length}</span> results
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
